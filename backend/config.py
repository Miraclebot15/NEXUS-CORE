"""
NEXUS CORE :: config.py
Loads and validates all environment configuration in one place.
Every other module imports `settings` from here instead of touching os.environ directly.
"""

import os
import sys
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    qwen_api_key: str
    qwen_base_url: str
    qwen_model: str
    db_path: str
    max_correction_attempts: int
    qwen_timeout_seconds: float
    clerk_issuer: str
    clerk_jwks_url: str
    auth_enabled: bool
    demo_user_id: str
    web_search_timeout_seconds: float


def _load_settings() -> Settings:
    api_key = os.getenv("QWEN_API_KEY", "").strip()

    base_url = os.getenv(
        "QWEN_BASE_URL",
        "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    ).strip()

    model = os.getenv("QWEN_MODEL", "qwen-turbo").strip()
    db_path = os.getenv("NEXUS_DB_PATH", "nexus_audit.db").strip()

    try:
        max_corrections = int(os.getenv("MAX_CORRECTION_ATTEMPTS", "2"))
    except ValueError:
        max_corrections = 2

    try:
        timeout = float(os.getenv("QWEN_TIMEOUT_SECONDS", "30"))
    except ValueError:
        timeout = 30.0

    if not api_key:
        # Fail loudly at startup rather than surfacing a confusing 401 mid-demo.
        print(
            "\n[NEXUS CORE][FATAL] QWEN_API_KEY is not set.\n"
            "Create a .env file (see .env.example) and set QWEN_API_KEY before starting the server.\n",
            file=sys.stderr,
        )
        sys.exit(1)

    clerk_issuer = os.getenv("CLERK_ISSUER", "").strip()
    clerk_jwks_url = os.getenv("CLERK_JWKS_URL", "").strip()
    if not clerk_jwks_url and clerk_issuer:
        clerk_jwks_url = f"{clerk_issuer.rstrip('/')}/.well-known/jwks.json"

    # Auth is only enforced once CLERK_ISSUER is actually configured. This lets
    # the backend run standalone (e.g. during this hackathon build-out, or for
    # anyone hitting the API directly) without requiring a Clerk account first.
    auth_enabled = bool(clerk_issuer)

    demo_user_id = os.getenv("DEMO_USER_ID", "demo-user").strip()

    try:
        web_search_timeout = float(os.getenv("WEB_SEARCH_TIMEOUT_SECONDS", "10"))
    except ValueError:
        web_search_timeout = 10.0

    return Settings(
        qwen_api_key=api_key,
        qwen_base_url=base_url,
        qwen_model=model,
        db_path=db_path,
        max_correction_attempts=max_corrections,
        qwen_timeout_seconds=timeout,
        clerk_issuer=clerk_issuer,
        clerk_jwks_url=clerk_jwks_url,
        auth_enabled=auth_enabled,
        demo_user_id=demo_user_id,
        web_search_timeout_seconds=web_search_timeout,
    )


settings = _load_settings()
