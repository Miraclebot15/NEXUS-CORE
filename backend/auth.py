"""
NEXUS CORE :: auth.py
Google OAuth 2.0 session-based authentication.
Login flow:
  GET /auth/google/login      -> redirects to Google consent screen
  GET /auth/google/callback   -> exchanges code for token, creates session
  GET /auth/logout            -> deletes session
  
Sessions are stored in SQLite with 7-day expiry.
In demo mode (no GOOGLE_OAUTH_CLIENT_ID set), all requests use demo_user_id.
"""

import secrets
import httpx
from datetime import datetime, timezone, timedelta
from fastapi import Header, HTTPException
from config import settings
import database

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
SESSION_DAYS = 7

def _now_plus(days: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()

def generate_state() -> str:
    return secrets.token_urlsafe(32)

def generate_session_token() -> str:
    return secrets.token_urlsafe(48)

def get_google_auth_url(state: str) -> str:
    import urllib.parse
    params = {
        "client_id": settings.google_oauth_client_id,
        "redirect_uri": settings.google_oauth_redirect_uri,
        "response_type": "code",
        "scope": (
            "openid email profile "
            "https://www.googleapis.com/auth/gmail.readonly "
            "https://www.googleapis.com/auth/gmail.send "
            "https://www.googleapis.com/auth/calendar "
            "https://www.googleapis.com/auth/drive.file "
            "https://www.googleapis.com/auth/spreadsheets "
            "https://www.googleapis.com/auth/documents "
            "https://www.googleapis.com/auth/contacts.readonly "
            "https://www.googleapis.com/auth/youtube"
        ),
        "state": state,
        "access_type": "offline",
        "prompt": "select_account",
    }
    return f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"

async def exchange_code_for_user(code: str) -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        token_resp = await client.post(GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": settings.google_oauth_client_id,
            "client_secret": settings.google_oauth_client_secret,
            "redirect_uri": settings.google_oauth_redirect_uri,
            "grant_type": "authorization_code",
        })
        if token_resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Authentication required.")
        tokens = token_resp.json()
        access_token = tokens.get("access_token")
        if not access_token:
            raise HTTPException(status_code=401, detail="Authentication required.")
        user_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"}
        )
        if user_resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Authentication required.")
        user_info = user_resp.json()
        user_info["_access_token"] = access_token
        user_info["_refresh_token"] = tokens.get("refresh_token")
        user_info["_expires_in"] = tokens.get("expires_in", 3600)
        return user_info

def create_user_session(google_user: dict) -> str:
    user_id = f"google_{google_user['id']}"
    email = google_user.get("email", "")
    name = google_user.get("name", "")
    picture = google_user.get("picture", "")
    database.get_or_create_user(user_id)
    token = generate_session_token()
    expires_at = _now_plus(SESSION_DAYS)
    database.create_session(token, user_id, email, name, picture, expires_at)
    return token

async def get_current_user_id(authorization: str | None = Header(default=None)) -> str:
    if not settings.auth_enabled:
        return settings.demo_user_id
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required.")
    database.cleanup_expired_sessions()
    session = database.get_session(token)
    if not session:
        raise HTTPException(status_code=401, detail="Authentication required.")
    now = datetime.now(timezone.utc).isoformat()
    if session["expires_at"] < now:
        database.delete_session(token)
        raise HTTPException(status_code=401, detail="Authentication required.")
    return session["user_id"]


def create_demo_session() -> str:
    """
    Creates a fresh, isolated temporary account for judges/reviewers --
    no Google OAuth needed. Each call gets its own unique demo_<id> user,
    so multiple simultaneous reviewers never share history with each other.
    Gmail-dependent features are intentionally disabled for these accounts
    (see tools.py) since there's no real inbox behind them.
    """
    import uuid
    user_id = f"demo_{uuid.uuid4().hex[:12]}"
    database.get_or_create_user(user_id)
    token = generate_session_token()
    expires_at = _now_plus(SESSION_DAYS)
    database.create_session(token, user_id, "", "Demo User", "", expires_at)
    return token
