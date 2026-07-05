"""
NEXUS CORE :: auth.py
Verifies Clerk-issued JWTs on incoming requests. The backend never talks to
Clerk's user database directly — it only verifies the signature/claims of a
token the frontend already obtained from Clerk, using Clerk's public JWKS.

DEMO MODE: if CLERK_ISSUER is not set in .env, auth is fully disabled and
every request is treated as `settings.demo_user_id`. This keeps the backend
runnable standalone (matches the original hackathon build) while still being
ready to enforce real auth the moment Clerk is configured.
"""

import time

import httpx
import jwt
from fastapi import Header, HTTPException
from jwt import PyJWKClient

from config import settings

_jwks_client: PyJWKClient | None = None
_jwks_client_created_at: float = 0.0
_JWKS_CLIENT_TTL_SECONDS = 3600


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client, _jwks_client_created_at
    now = time.time()
    if _jwks_client is None or (now - _jwks_client_created_at) > _JWKS_CLIENT_TTL_SECONDS:
        _jwks_client = PyJWKClient(settings.clerk_jwks_url)
        _jwks_client_created_at = now
    return _jwks_client


def _verify_token(token: str) -> dict:
    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=settings.clerk_issuer,
            options={"verify_aud": False},
        )
        return claims
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired.")
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail=f"Could not reach Clerk JWKS endpoint: {exc}")


async def get_current_user_id(authorization: str | None = Header(default=None)) -> str:
    """
    FastAPI dependency. Returns a stable user identifier for the request.

    - If auth is disabled (no CLERK_ISSUER configured), returns the demo user.
    - Otherwise requires `Authorization: Bearer <clerk_jwt>` and returns the
      token's `sub` claim (Clerk's user id).
    """
    if not settings.auth_enabled:
        return settings.demo_user_id

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization: Bearer <token> header.")

    token = authorization.split(" ", 1)[1].strip()
    claims = _verify_token(token)

    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing 'sub' claim.")
    return user_id
