import logging
import re
import time
import unicodedata
from collections import defaultdict
from typing import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("nexus.security")

_SAFE_ERRORS = {
    400: "Bad request.",
    401: "Authentication required.",
    403: "Access denied.",
    404: "Resource not found.",
    405: "Method not allowed.",
    413: "Request too large.",
    429: "Too many requests. Slow down.",
    500: "Something went wrong.",
    502: "Service temporarily unavailable.",
    503: "Service temporarily unavailable.",
}

def safe_error(status_code: int, detail: str | None = None) -> JSONResponse:
    message = _SAFE_ERRORS.get(status_code, "An error occurred.")
    if detail and status_code in (400, 401, 403, 404, 422, 429):
        message = detail
    return JSONResponse(status_code=status_code, content={"error": message})

def sanitize_stream_error(exc: Exception) -> str:
    exc_type = type(exc).__name__
    safe_map = {
        "Timeout": "Request timed out.",
        "ConnectionError": "Connection failed.",
        "JSONDecodeError": "Invalid response from service.",
        "KeyError": "Internal processing error.",
        "AttributeError": "Internal processing error.",
        "httpx": "External service error.",
    }
    for key, msg in safe_map.items():
        if key.lower() in exc_type.lower() or key.lower() in str(exc).lower():
            return msg
    logger.error("Stream error [%s]: %s", exc_type, exc, exc_info=True)
    return "An unexpected error occurred."

class RateLimiter:
    def __init__(self):
        self._windows: dict[str, list[float]] = defaultdict(list)

    def is_allowed(self, key: str, max_requests: int, window_seconds: int) -> bool:
        now = time.time()
        window_start = now - window_seconds
        self._windows[key] = [t for t in self._windows[key] if t > window_start]
        if len(self._windows[key]) >= max_requests:
            return False
        self._windows[key].append(now)
        return True

_rate_limiter = RateLimiter()

RATE_LIMITS = {
    "/api/task/stream": (10, 60),
    "/api/messages/search": (30, 60),
    "/auth/": (5, 60),
    "default": (60, 60),
}

_INJECTION_PATTERNS = [
    re.compile(r"<script[\s\S]*?>[\s\S]*?</script>", re.IGNORECASE),
    re.compile(r"javascript:", re.IGNORECASE),
    re.compile(r"on\w+\s*=", re.IGNORECASE),
    re.compile(r"UNION.*SELECT", re.IGNORECASE),
    re.compile(r";\s*(DROP|DELETE|TRUNCATE|ALTER)", re.IGNORECASE),
    re.compile(r"\.\./|\.\.\\"),
    re.compile(r"%2e%2e%2f", re.IGNORECASE),
]

_SSRF_PATTERNS = [
    re.compile(r"169\.254\.169\.254"),
    re.compile(r"metadata\.google\.internal", re.IGNORECASE),
    re.compile(r"localhost", re.IGNORECASE),
    re.compile(r"127\.0\.0\.1"),
    re.compile(r"0\.0\.0\.0"),
    re.compile(r"::1"),
    re.compile(r"10\.\d+\.\d+\.\d+"),
    re.compile(r"172\.(1[6-9]|2\d|3[01])\.\d+\.\d+"),
    re.compile(r"192\.168\.\d+\.\d+"),
    re.compile(r"file://", re.IGNORECASE),
    re.compile(r"gopher://", re.IGNORECASE),
    re.compile(r"dict://", re.IGNORECASE),
    re.compile(r"ftp://", re.IGNORECASE),
]

_PROMPT_INJECTION_PATTERNS = [
    re.compile(r"ignore (previous|all|above|prior) instructions", re.IGNORECASE),
    re.compile(r"disregard (previous|all|above|prior)", re.IGNORECASE),
    re.compile(r"you are now", re.IGNORECASE),
    re.compile(r"new (persona|role|instructions|rules)", re.IGNORECASE),
    re.compile(r"system prompt", re.IGNORECASE),
    re.compile(r"jailbreak", re.IGNORECASE),
    re.compile(r"DAN mode", re.IGNORECASE),
    re.compile(r"pretend you (are|have no)", re.IGNORECASE),
    re.compile(r"act as if", re.IGNORECASE),
    re.compile(r"roleplay as", re.IGNORECASE),
]

MAX_PROMPT_LENGTH = 4000

def normalize_input(value: str) -> str:
    """Normalize unicode to catch homoglyph and encoding attacks."""
    # NFKC normalization converts homoglyphs to their canonical form
    # e.g. ａｌｅｒｔ -> alert, ＳＥＬＥＣＴ -> SELECT
    normalized = unicodedata.normalize("NFKC", value)
    # Decode common URL encoding tricks
    try:
        import urllib.parse
        normalized = urllib.parse.unquote(normalized)
        normalized = urllib.parse.unquote(normalized)  # double decode
    except Exception:
        pass
    # Strip zero-width chars used to break pattern matching
    zero_width = [
        "\u200b", "\u200c", "\u200d", "\u200e", "\u200f",
        "\ufeff", "\u2060", "\u2061", "\u2062", "\u2063",
    ]
    for zw in zero_width:
        normalized = normalized.replace(zw, "")
    return normalized

def contains_injection(value: str) -> bool:
    value = normalize_input(value)
    for pattern in _INJECTION_PATTERNS:
        if pattern.search(value):
            return True
    return False

def contains_ssrf(value: str) -> bool:
    value = normalize_input(value)
    for pattern in _SSRF_PATTERNS:
        if pattern.search(value):
            return True
    return False

def contains_prompt_injection(value: str) -> bool:
    value = normalize_input(value)
    for pattern in _PROMPT_INJECTION_PATTERNS:
        if pattern.search(value):
            return True
    return False

def sanitize_prompt(prompt: str) -> tuple[bool, str]:
    prompt = normalize_input(prompt)
    if not prompt or not prompt.strip():
        return False, "Prompt cannot be empty."
    if len(prompt) > MAX_PROMPT_LENGTH:
        return False, "Prompt too long."
    if contains_injection(prompt):
        logger.warning("Injection attempt in prompt: %s", prompt[:100])
        return False, "Invalid input detected."
    if contains_ssrf(prompt):
        logger.warning("SSRF attempt in prompt: %s", prompt[:100])
        return False, "Invalid input detected."
    return True, ""

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "connect-src 'self' https:;"
    ),
}

class SecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path

        limit_key = None
        for prefix, (max_req, window) in RATE_LIMITS.items():
            if prefix != "default" and path.startswith(prefix):
                limit_key = (prefix, max_req, window)
                break
        if not limit_key:
            max_req, window = RATE_LIMITS["default"]
            limit_key = ("default", max_req, window)

        prefix, max_req, window = limit_key
        rate_key = f"{client_ip}:{prefix}"
        if not _rate_limiter.is_allowed(rate_key, max_req, window):
            logger.warning("Rate limit hit: %s on %s", client_ip, path)
            return JSONResponse(
                status_code=429,
                content={"error": "Too many requests. Slow down."},
                headers={"Retry-After": str(window)},
            )

        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > 1_000_000:
            return JSONResponse(status_code=413, content={"error": "Request too large."})

        try:
            response = await call_next(request)
        except Exception as exc:
            logger.error("Unhandled exception on %s: %s", path, exc, exc_info=True)
            return JSONResponse(status_code=500, content={"error": "Something went wrong."})

        for header, value in SECURITY_HEADERS.items():
            response.headers[header] = value

        return response
