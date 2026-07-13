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
    qwen_fast_model: str
    db_path: str
    max_correction_attempts: int
    qwen_timeout_seconds: float
    google_oauth_client_id: str
    google_oauth_client_secret: str
    google_oauth_redirect_uri: str
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
    fast_model = os.getenv("QWEN_FAST_MODEL", "qwen-turbo").strip()
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

    google_oauth_client_id = os.getenv("GOOGLE_OAUTH_CLIENT_ID", "").strip()
    google_oauth_client_secret = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET", "").strip()
    google_oauth_redirect_uri = os.getenv(
        "GOOGLE_OAUTH_REDIRECT_URI",
        "http://nexus-core-app.duckdns.org:8000/auth/google/callback"
    ).strip()
    demo_mode = os.getenv('DEMO_MODE', 'false').strip().lower() == 'true'
    auth_enabled = bool(google_oauth_client_id) and not demo_mode
    demo_user_id = os.getenv("DEMO_USER_ID", "demo-user").strip()

    try:
        web_search_timeout = float(os.getenv("WEB_SEARCH_TIMEOUT_SECONDS", "10"))
    except ValueError:
        web_search_timeout = 10.0

    return Settings(
        qwen_api_key=api_key,
        qwen_base_url=base_url,
        qwen_model=model,
        qwen_fast_model=fast_model,
        db_path=db_path,
        max_correction_attempts=max_corrections,
        qwen_timeout_seconds=timeout,
        google_oauth_client_id=google_oauth_client_id,
        google_oauth_client_secret=google_oauth_client_secret,
        google_oauth_redirect_uri=google_oauth_redirect_uri,
        auth_enabled=auth_enabled,
        demo_user_id=demo_user_id,
        web_search_timeout_seconds=web_search_timeout,
    )


settings = _load_settings()


# ==========================================================================
# MODEL_KEY_MAP — single source of truth mapping a model name to the env
# var holding its dedicated API key. Add a new model here (and its key to
# .env) and every caller automatically picks up the right credential.
# Models not listed here fall back to the default QWEN_API_KEY.
# ==========================================================================
MODEL_KEY_MAP = {
    "qwen3.7-max": "QWEN_37_MAX_API_KEY",
    "qwen3.7-plus": "QWEN_37_PLUS_API_KEY",
    "qwen3.6-plus": "QWEN_36_PLUS_API_KEY",
    "qwen3.6-max-preview": "QWEN_36_MAX_PREVIEW_API_KEY",
    "qwen3.6-flash": "QWEN_36_FLASH_API_KEY",
    "qwen3.6-35b-a3b": "QWEN_36_35B_A3B_API_KEY",
    "qwen3-coder-plus": "QWEN_CODER_PLUS_API_KEY",
    "qwen3-coder-480b-a35b-instruct": "QWEN_CODER_480B_A35B_INSTRUCT_API_KEY",
    "qwen-plus-character": "QWEN_PLUS_CHARACTER_API_KEY",
    "qwen-image-2.0-pro": "QWEN_IMAGE_2_0_PRO_API_KEY",
    "qwen-image-max": "QWEN_IMAGE_MAX_API_KEY",
    "qwen-image-edit-max": "QWEN_IMAGE_EDIT_MAX_API_KEY",
    "qwen3-vl-plus-2025-12-19": "QWEN3_VL_PLUS_API_KEY",
    "qwen3-vl-flash": "QWEN3_VL_FLASH_API_KEY",
    "qwen-vl-ocr": "QWEN_VL_OCR_API_KEY",
    "qwen3-livetranslate-flash-realtime": "QWEN3_LIVETRANSLATE_FLASH_REALTIME_API_KEY",
    "qwen-mt-flash": "QWEN_MT_FLASH_API_KEY",
    "qwen3-omni-flash-realtime": "QWEN3_OMNI_FLASH_REALTIME_API_KEY",
    "qwen3.5-omni-plus-realtime": "QWEN35_OMNI_PLUS_REALTIME_API_KEY",
    "qwen3-tts-flash-realtime": "QWEN3_TTS_FLASH_REALTIME_API_KEY",
    "cosyvoice-v3-plus": "COSYVOICE_V3_PLUS_API_KEY",
    "fun-asr-realtime": "FUN_ASR_REALTIME_API_KEY",
    "fun-asr-mtl": "FUN_ASR_MTL_API_KEY",
    "text-embedding-v4": "TEXT_EMBEDDING_V4_API_KEY",
    "tongyi-embedding-vision-flash": "TONGYI_EMBEDDING_VISION_FLASH_API_KEY",
    "qwen3-rerank": "QWEN3_RERANK_API_KEY",
    "wan2.7-t2v": "WAN27_T2V_API_KEY",
    "wan2.7-i2v": "WAN27_I2V_API_KEY",
    "wan2.7-r2v": "WAN27_R2V_API_KEY",
    "wan2.7-videoedit": "WAN27_VIDEOEDIT_API_KEY",
    "happyhorse-1.1-t2v": "HAPPYHORSE_11_T2V_API_KEY",
    "happyhorse-1.1-i2v": "HAPPYHORSE_11_I2V_API_KEY",
    "happyhorse-1.0-video-edit": "HAPPYHORSE_10_VIDEOEDIT_API_KEY",
}


def get_api_key_for_model(model_name: str) -> str:
    """
    Returns the correct dedicated API key for a given model name.
    Falls back to the default QWEN_API_KEY if the model has no dedicated
    key configured (or the dedicated key is blank/missing in .env).
    """
    env_var = MODEL_KEY_MAP.get(model_name)
    if env_var:
        key = os.getenv(env_var, "").strip()
        if key:
            return key
    return settings.qwen_api_key
