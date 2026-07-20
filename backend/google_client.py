"""
NEXUS CORE :: google_client.py
Handles getting a valid Google OAuth access token for a user, refreshing
it via their stored refresh_token when the current one has expired.
"""

import httpx
from datetime import datetime, timezone, timedelta
from config import settings
import database

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


async def get_valid_access_token(user_id: str) -> str | None:
    """
    Returns a valid Google access token for this user, refreshing it first
    if expired. Returns None if the user has never connected Google, or if
    refresh fails (e.g. they revoked access).
    """
    tokens = database.get_google_tokens(user_id)
    if not tokens:
        return None

    now = datetime.now(timezone.utc).isoformat()
    if tokens["expires_at"] and tokens["expires_at"] > now:
        return tokens["access_token"]

    if not tokens["refresh_token"]:
        return None

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(GOOGLE_TOKEN_URL, data={
            "client_id": settings.google_oauth_client_id,
            "client_secret": settings.google_oauth_client_secret,
            "refresh_token": tokens["refresh_token"],
            "grant_type": "refresh_token",
        })
        if resp.status_code != 200:
            return None
        data = resp.json()
        new_access_token = data.get("access_token")
        if not new_access_token:
            return None
        expires_in = data.get("expires_in", 3600)
        new_expires_at = (datetime.now(timezone.utc) + timedelta(seconds=expires_in)).isoformat()
        database.save_google_tokens(user_id, new_access_token, None, new_expires_at)
        return new_access_token
