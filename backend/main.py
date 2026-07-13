"""
NEXUS CORE :: main.py
The Orchestration Layer's HTTP surface. Routes:

  Auth (Clerk JWT, auto-disabled in demo mode -- see auth.py)
  Projects / Conversations / Messages  (Tier 1 data model)
  GET  /api/task/stream                (SSE -- the live governance pipeline)
  GET  /api/messages/search            (FTS5 "semantic memory" retrieval)
  GET  /api/tasks/{task_id}/artifacts  (Artifact System)
  GET  /api/audit, /api/health
"""

import asyncio
import json

import os
import shutil
from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

import database
from auth import get_current_user_id, get_google_auth_url, exchange_code_for_user, create_user_session, generate_state
from config import settings
from models import (
    ArtifactOut,
    ConversationCreate,
    ConversationOut,
    MessageOut,
    MessageSearchResult,
    ProjectCreate,
    ProjectOut,
)
from orchestrator import run_pipeline
from security import SecurityMiddleware, sanitize_prompt, sanitize_stream_error

app = FastAPI(title="NEXUS CORE", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://43.98.186.150:3000",
        "http://nexus-core-app.duckdns.org:3000",
    ],
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
    allow_credentials=True,
)
app.add_middleware(SecurityMiddleware)


# In-memory state store for OAuth CSRF protection
_oauth_states: dict[str, float] = {}

@app.get("/auth/google/login")
async def google_login():
    import time
    state = generate_state()
    _oauth_states[state] = time.time() + 600  # 10 min expiry
    # Cleanup old states
    now = time.time()
    expired = [k for k, v in _oauth_states.items() if v < now]
    for k in expired:
        del _oauth_states[k]
    from fastapi.responses import RedirectResponse
    return RedirectResponse(get_google_auth_url(state))

@app.get("/auth/google/callback")
async def google_callback(code: str = Query(...), state: str = Query(...)):
    import time
    from fastapi.responses import RedirectResponse
    # Validate state to prevent CSRF
    if state not in _oauth_states or _oauth_states[state] < time.time():
        _oauth_states.pop(state, None)
        raise HTTPException(status_code=400, detail="Invalid or expired state.")
    del _oauth_states[state]
    google_user = await exchange_code_for_user(code)
    token = create_user_session(google_user)
    frontend_url = f"http://nexus-core-app.duckdns.org:3000/auth/callback?token={token}"
    return RedirectResponse(frontend_url)

@app.get("/auth/logout")
async def logout(authorization: str | None = None):
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        database.delete_session(token)
    return {"ok": True}

@app.get("/auth/me")
async def me(user_id: str = Depends(get_current_user_id)):
    return {"user_id": user_id}

@app.on_event("startup")
def _startup() -> None:
    database.init_db()
    if not settings.auth_enabled:
        database.get_or_create_user(settings.demo_user_id)


# --------------------------------------------------------------------------
# Projects
# --------------------------------------------------------------------------

@app.post("/api/projects", response_model=ProjectOut)
def create_project(body: ProjectCreate, user_id: str = Depends(get_current_user_id)):
    database.get_or_create_user(user_id)
    return database.create_project(user_id, body.name)


@app.get("/api/projects", response_model=list[ProjectOut])
def list_projects(user_id: str = Depends(get_current_user_id)):
    database.get_or_create_user(user_id)
    return database.list_projects(user_id)


# --------------------------------------------------------------------------
# Conversations
# --------------------------------------------------------------------------

@app.post("/api/projects/{project_id}/conversations", response_model=ConversationOut)
def create_conversation(
    project_id: str, body: ConversationCreate, user_id: str = Depends(get_current_user_id)
):
    project = database.get_project(project_id, user_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return database.create_conversation(project_id, user_id, body.title)


@app.get("/api/projects/{project_id}/conversations", response_model=list[ConversationOut])
def list_conversations(project_id: str, user_id: str = Depends(get_current_user_id)):
    project = database.get_project(project_id, user_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return database.list_conversations(project_id, user_id)


@app.get("/api/conversations/{conversation_id}/messages", response_model=list[MessageOut])
def get_messages(conversation_id: str, user_id: str = Depends(get_current_user_id)):
    conversation = database.get_conversation(conversation_id, user_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return database.list_messages(conversation_id)


@app.patch("/api/conversations/{conversation_id}", response_model=ConversationOut)
def rename_conversation(
    conversation_id: str, body: ConversationCreate, user_id: str = Depends(get_current_user_id)
):
    updated = database.update_conversation_title(conversation_id, user_id, body.title)
    if not updated:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return updated


@app.delete("/api/conversations/{conversation_id}")
def delete_conversation(conversation_id: str, user_id: str = Depends(get_current_user_id)):
    ok = database.delete_conversation(conversation_id, user_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return {"deleted": True}


@app.delete("/api/conversations/{conversation_id}/messages/{message_id}")
def delete_messages_from(
    conversation_id: str, message_id: str, user_id: str = Depends(get_current_user_id)
):
    """Deletes the given message and everything after it in the conversation.
    Used by the frontend for 'edit and resend' and for a clean 'regenerate'
    (removing the stale turn before resubmitting), without touching the
    immutable audit log."""
    ok = database.delete_messages_from(conversation_id, user_id, message_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Message not found.")
    return {"deleted": True}


def _get_or_bootstrap_conversation(user_id: str, conversation_id: str | None) -> str:
    """
    If the caller already has a conversation_id, validate it belongs to them.
    Otherwise, auto-provision a default project + conversation so the SSE
    endpoint is usable immediately without requiring the frontend to first
    create a project (handy for quick demos / the old single-page UI).
    """
    if conversation_id:
        conversation = database.get_conversation(conversation_id, user_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found.")
        return conversation_id

    projects = database.list_projects(user_id)
    if projects:
        project_id = projects[0]["id"]
    else:
        project_id = database.create_project(user_id, "Quick Tasks")["id"]

    conversations = database.list_conversations(project_id, user_id)
    if conversations:
        return conversations[0]["id"]
    return database.create_conversation(project_id, user_id, "Quick Tasks")["id"]


# --------------------------------------------------------------------------
# Streaming task pipeline (SSE)
# --------------------------------------------------------------------------

@app.get("/api/task/stream")
async def stream_task(
    request: Request,
    prompt: str = Query(..., min_length=1, max_length=4000),
    conversation_id: str | None = Query(default=None),
    user_id: str = Depends(get_current_user_id),
):
    valid, reason = sanitize_prompt(prompt)
    if not valid:
        from fastapi.responses import JSONResponse as JR
        return JR(status_code=400, content={"error": reason})
    database.get_or_create_user(user_id)
    resolved_conversation_id = _get_or_bootstrap_conversation(user_id, conversation_id)

    async def event_stream():
        pipeline = run_pipeline(user_id, resolved_conversation_id, prompt)
        try:
            async for event in pipeline:
                # If the client aborted (e.g. the user clicked Stop), stop
                # advancing the pipeline rather than running the remaining
                # stages -- and burning further Qwen calls -- regardless.
                # This can't interrupt a Qwen call already in flight, but it
                # stops everything after the current await from running.
                if await request.is_disconnected():
                    await pipeline.aclose()
                    return
                payload = json.dumps(event.model_dump(), default=str)
                yield f"event: {event.stage}\ndata: {payload}\n\n"
                await asyncio.sleep(0)  # yield control so the client receives it immediately
        except Exception as exc:  # noqa: BLE001 - never let the stream die silently
            safe_msg = sanitize_stream_error(exc)
            error_payload = json.dumps({"error": safe_msg})
            yield f"event: STREAM_ERROR\ndata: {error_payload}\n\n"
        finally:
            yield "event: STREAM_END\ndata: {}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable proxy buffering for real-time delivery
            "Connection": "keep-alive",
        },
    )


# --------------------------------------------------------------------------
# Memory search (FTS5)
# --------------------------------------------------------------------------

@app.get("/api/messages/search", response_model=list[MessageSearchResult])
def search_messages(
    q: str = Query(..., min_length=1, max_length=200),
    limit: int = Query(default=20, le=100),
    user_id: str = Depends(get_current_user_id),
):
    return database.search_messages(user_id, q, limit=limit)


# --------------------------------------------------------------------------
# Artifacts
# --------------------------------------------------------------------------

@app.get("/api/tasks/{task_id}/artifacts", response_model=list[ArtifactOut])
def get_task_artifacts(task_id: str, user_id: str = Depends(get_current_user_id)):
    task = database.get_task(task_id)
    if not task or task["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Task not found.")
    return database.list_artifacts(task_id)


@app.get("/api/artifacts/{artifact_id}", response_model=ArtifactOut)
def get_artifact(artifact_id: str, user_id: str = Depends(get_current_user_id)):
    artifact = database.get_artifact(artifact_id)
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found.")
    task = database.get_task(artifact["task_id"])
    if not task or task["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Artifact not found.")
    return artifact


# --------------------------------------------------------------------------
# File upload endpoint
# --------------------------------------------------------------------------

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".xlsx", ".xls", ".csv", ".txt", ".png", ".jpg", ".jpeg", ".webp", ".mp4", ".mov"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    import uuid
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File type not supported.")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Max 50MB.")

    safe_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)

    with open(file_path, "wb") as f:
        f.write(content)

    return {
        "file_id": safe_name,
        "original_name": file.filename,
        "size": len(content),
        "ext": ext,
        "path": file_path,
    }

@app.delete("/api/upload/{file_id}")
async def delete_upload(file_id: str, user_id: str = Depends(get_current_user_id)):
    import re
    if not re.match(r'^[a-f0-9]{32}\.[a-z0-9]+$', file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID.")
    file_path = os.path.join(UPLOAD_DIR, file_id)
    if os.path.exists(file_path):
        os.remove(file_path)
    return {"ok": True}

# --------------------------------------------------------------------------
# Audit / health
# --------------------------------------------------------------------------

@app.get("/api/audit")
def get_audit(limit: int = 200):
    return {
        "chain_valid": database.verify_chain(),
        "records": database.get_audit_trail(limit=limit),
    }


@app.get("/api/health")
def health():
    return {
        "status": "ONLINE",
        "model": settings.qwen_model,
        "base_url": settings.qwen_base_url,
        "chain_valid": database.verify_chain(),
        "auth_enabled": settings.auth_enabled,
    }


app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
def index():
    return FileResponse("static/index.html")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
