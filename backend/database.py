"""
NEXUS CORE :: database.py
Local SQLite persistence for the Memory/Audit Layer.

Design notes:
- Uses a single append-only table.
- Every row stores sha256(prev_hash + row_content) as `record_hash`, forming a
  hash chain. This makes the log tamper-evident: mutating any historical row
  breaks the chain from that point forward, which `verify_chain()` detects.
  It's not a blockchain, but it satisfies "immutable audit trail" without
  pulling in any external database (per the no-external-DB hackathon rule).
- All access goes through short-lived connections with WAL mode enabled so
  concurrent FastAPI requests don't lock each other out during a demo.
"""

import hashlib
import json
import sqlite3
import threading
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone

from config import settings

_LOCK = threading.Lock()


def _now() -> str:
    # timespec='microseconds' forces a fixed-width format every time --
    # isoformat() otherwise omits microseconds when they're exactly zero,
    # which silently breaks lexicographic ordering/range comparisons on
    # created_at (used by ORDER BY and by delete_messages_from's >= range).
    return datetime.now(timezone.utc).isoformat(timespec='microseconds')


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:16]}"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS audit_log (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id       TEXT    NOT NULL,
    stage         TEXT    NOT NULL,
    label         TEXT    NOT NULL,
    detail_json   TEXT    NOT NULL,
    timestamp     TEXT    NOT NULL,
    prev_hash     TEXT    NOT NULL,
    record_hash   TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_task_id ON audit_log(task_id);

CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,          -- Clerk user id (or demo_user_id)
    created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL,
    name          TEXT NOT NULL,
    created_at    TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);

CREATE TABLE IF NOT EXISTS conversations (
    id            TEXT PRIMARY KEY,
    project_id    TEXT NOT NULL,
    user_id       TEXT NOT NULL,
    title         TEXT NOT NULL,
    created_at    TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);
CREATE INDEX IF NOT EXISTS idx_conversations_project ON conversations(project_id);

CREATE TABLE IF NOT EXISTS messages (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role            TEXT NOT NULL,   -- 'user' | 'assistant'
    content         TEXT NOT NULL,
    task_id         TEXT,            -- linked orchestration run, if any
    created_at      TEXT NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

CREATE TABLE IF NOT EXISTS tasks (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    prompt          TEXT NOT NULL,
    final_status    TEXT NOT NULL DEFAULT 'RUNNING',
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);
CREATE INDEX IF NOT EXISTS idx_tasks_conversation ON tasks(conversation_id);

CREATE TABLE IF NOT EXISTS artifacts (
    id            TEXT PRIMARY KEY,
    task_id       TEXT NOT NULL,
    artifact_type TEXT NOT NULL,     -- 'text' | 'code' | 'search_results' | ...
    title         TEXT NOT NULL,
    content       TEXT NOT NULL,
    created_at    TEXT NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);
CREATE INDEX IF NOT EXISTS idx_artifacts_task ON artifacts(task_id);

CREATE TABLE IF NOT EXISTS sessions (
    token         TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL,
    email         TEXT NOT NULL,
    name          TEXT,
    picture       TEXT,
    created_at    TEXT NOT NULL,
    expires_at    TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
"""

_GENESIS_HASH = "0" * 64

# FTS5 full-text index over message content -- the hackathon-grade "semantic
# memory" retrieval layer (keyword/relevance search, no external vector DB
# or embedding service required). Kept separate from _SCHEMA and applied in
# its own try/except in init_db(): not every SQLite build ships with FTS5
# compiled in, and a missing extension shouldn't crash the whole app at
# startup -- it should just disable memory search.
_FTS_SCHEMA = """
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
    content, content='messages', content_rowid='rowid'
);
CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
    INSERT INTO messages_fts(rowid, content) VALUES (new.rowid, new.content);
END;
"""

FTS5_AVAILABLE = True


@contextmanager
def _connect():
    conn = sqlite3.connect(settings.db_path, timeout=10, check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL;")
    try:
        yield conn
    finally:
        conn.close()


def init_db() -> None:
    global FTS5_AVAILABLE
    with _connect() as conn:
        conn.executescript(_SCHEMA)
        conn.commit()
        try:
            conn.executescript(_FTS_SCHEMA)
            conn.commit()
            FTS5_AVAILABLE = True
        except sqlite3.OperationalError as exc:
            FTS5_AVAILABLE = False
            print(
                f"[NEXUS CORE][WARN] FTS5 is not available in this SQLite build "
                f"({exc}). Memory search (/api/messages/search) will return "
                f"empty results instead of crashing the app.",
            )


def _last_hash(conn: sqlite3.Connection) -> str:
    row = conn.execute(
        "SELECT record_hash FROM audit_log ORDER BY id DESC LIMIT 1"
    ).fetchone()
    return row[0] if row else _GENESIS_HASH


def _compute_hash(prev_hash: str, task_id: str, stage: str, label: str,
                   detail_json: str, timestamp: str) -> str:
    payload = f"{prev_hash}|{task_id}|{stage}|{label}|{detail_json}|{timestamp}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def append_audit_record(task_id: str, stage: str, label: str, detail: object) -> dict:
    """Thread-safe, hash-chained insert. Returns the inserted record as a dict."""
    timestamp = _now()
    try:
        detail_json = json.dumps(detail, default=str)
    except TypeError:
        detail_json = json.dumps(str(detail))

    with _LOCK:
        with _connect() as conn:
            prev_hash = _last_hash(conn)
            record_hash = _compute_hash(
                prev_hash, task_id, stage, label, detail_json, timestamp
            )
            conn.execute(
                """INSERT INTO audit_log
                   (task_id, stage, label, detail_json, timestamp, prev_hash, record_hash)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (task_id, stage, label, detail_json, timestamp, prev_hash, record_hash),
            )
            conn.commit()

    return {
        "task_id": task_id,
        "stage": stage,
        "label": label,
        "detail": detail,
        "timestamp": timestamp,
        "prev_hash": prev_hash,
        "record_hash": record_hash,
    }


def get_audit_trail(limit: int = 200) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            """SELECT task_id, stage, label, detail_json, timestamp, prev_hash, record_hash
               FROM audit_log ORDER BY id DESC LIMIT ?""",
            (limit,),
        ).fetchall()

    trail = []
    for task_id, stage, label, detail_json, timestamp, prev_hash, record_hash in rows:
        try:
            detail = json.loads(detail_json)
        except json.JSONDecodeError:
            detail = detail_json
        trail.append(
            {
                "task_id": task_id,
                "stage": stage,
                "label": label,
                "detail": detail,
                "timestamp": timestamp,
                "prev_hash": prev_hash,
                "record_hash": record_hash,
            }
        )
    trail.reverse()
    return trail


def verify_chain() -> bool:
    """Walks the full log and confirms every record_hash matches its recomputed value."""
    with _connect() as conn:
        rows = conn.execute(
            """SELECT task_id, stage, label, detail_json, timestamp, prev_hash, record_hash
               FROM audit_log ORDER BY id ASC"""
        ).fetchall()

    expected_prev = _GENESIS_HASH
    for task_id, stage, label, detail_json, timestamp, prev_hash, record_hash in rows:
        if prev_hash != expected_prev:
            return False
        recomputed = _compute_hash(prev_hash, task_id, stage, label, detail_json, timestamp)
        if recomputed != record_hash:
            return False
        expected_prev = record_hash
    return True


# --------------------------------------------------------------------------
# Users / Projects / Conversations / Messages / Tasks / Artifacts
# --------------------------------------------------------------------------

def get_or_create_user(user_id: str) -> dict:
    with _LOCK, _connect() as conn:
        print("DEBUG DB:", conn.execute("PRAGMA database_list").fetchall())
        row = conn.execute("SELECT id, created_at FROM users WHERE id = ?", (user_id,)).fetchone()
        if row:
            return {"id": row[0], "created_at": row[1]}
        created_at = _now()
        conn.execute("INSERT INTO users (id, created_at) VALUES (?, ?)", (user_id, created_at))
        conn.commit()
        return {"id": user_id, "created_at": created_at}


def save_google_tokens(user_id: str, access_token: str, refresh_token: str | None, expires_at: str) -> None:
    """Persist Google OAuth tokens for a user so we can call Gmail/Calendar/Drive
    APIs on their behalf later. refresh_token is only sent by Google on first
    consent -- if None, we keep whatever refresh_token is already stored."""
    with _LOCK, _connect() as conn:
        if refresh_token:
            conn.execute(
                "UPDATE users SET google_access_token = ?, google_refresh_token = ?, google_token_expires_at = ? WHERE id = ?",
                (access_token, refresh_token, expires_at, user_id),
            )
        else:
            conn.execute(
                "UPDATE users SET google_access_token = ?, google_token_expires_at = ? WHERE id = ?",
                (access_token, expires_at, user_id),
            )
        conn.commit()


def get_google_tokens(user_id: str) -> dict | None:
    """Return stored Google tokens for a user, or None if never connected."""
    with _LOCK, _connect() as conn:
        row = conn.execute(
            "SELECT google_access_token, google_refresh_token, google_token_expires_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if not row or not row[0]:
            return None
        return {
            "access_token": row[0],
            "refresh_token": row[1],
            "expires_at": row[2],
        }


def create_project(user_id: str, name: str) -> dict:
    project_id = new_id("proj")
    created_at = _now()
    with _LOCK, _connect() as conn:
        print("DEBUG DB:", conn.execute("PRAGMA database_list").fetchall())
        conn.execute(
            "INSERT INTO projects (id, user_id, name, created_at) VALUES (?, ?, ?, ?)",
            (project_id, user_id, name, created_at),
        )
        conn.commit()
    return {"id": project_id, "user_id": user_id, "name": name, "created_at": created_at}


def list_projects(user_id: str) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT id, user_id, name, created_at FROM projects WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()
    return [{"id": r[0], "user_id": r[1], "name": r[2], "created_at": r[3]} for r in rows]


def get_project(project_id: str, user_id: str) -> dict | None:
    with _connect() as conn:
        row = conn.execute(
            "SELECT id, user_id, name, created_at FROM projects WHERE id = ? AND user_id = ?",
            (project_id, user_id),
        ).fetchone()
    if not row:
        return None
    return {"id": row[0], "user_id": row[1], "name": row[2], "created_at": row[3]}


def create_conversation(project_id: str, user_id: str, title: str) -> dict:
    conversation_id = new_id("conv")
    created_at = _now()
    with _LOCK, _connect() as conn:
        print("DEBUG DB:", conn.execute("PRAGMA database_list").fetchall())
        conn.execute(
            """INSERT INTO conversations (id, project_id, user_id, title, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (conversation_id, project_id, user_id, title, created_at),
        )
        conn.commit()
    return {
        "id": conversation_id, "project_id": project_id, "user_id": user_id,
        "title": title, "created_at": created_at,
    }


def list_conversations(project_id: str, user_id: str) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            """SELECT id, project_id, user_id, title, created_at FROM conversations
               WHERE project_id = ? AND user_id = ? ORDER BY created_at DESC""",
            (project_id, user_id),
        ).fetchall()
    return [
        {"id": r[0], "project_id": r[1], "user_id": r[2], "title": r[3], "created_at": r[4]}
        for r in rows
    ]


def get_conversation(conversation_id: str, user_id: str) -> dict | None:
    with _connect() as conn:
        row = conn.execute(
            """SELECT id, project_id, user_id, title, created_at FROM conversations
               WHERE id = ? AND user_id = ?""",
            (conversation_id, user_id),
        ).fetchone()
    if not row:
        return None
    return {"id": row[0], "project_id": row[1], "user_id": row[2], "title": row[3], "created_at": row[4]}


def update_conversation_title(conversation_id: str, user_id: str, title: str) -> dict | None:
    with _LOCK, _connect() as conn:
        print("DEBUG DB:", conn.execute("PRAGMA database_list").fetchall())
        cur = conn.execute(
            "UPDATE conversations SET title = ? WHERE id = ? AND user_id = ?",
            (title, conversation_id, user_id),
        )
        conn.commit()
        if cur.rowcount == 0:
            return None
    return get_conversation(conversation_id, user_id)


def add_message(conversation_id: str, role: str, content: str, task_id: str | None = None) -> dict:
    message_id = new_id("msg")
    created_at = _now()
    with _LOCK, _connect() as conn:
        print("DEBUG DB:", conn.execute("PRAGMA database_list").fetchall())
        conn.execute(
            """INSERT INTO messages (id, conversation_id, role, content, task_id, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (message_id, conversation_id, role, content, task_id, created_at),
        )
        conn.commit()
    return {
        "id": message_id, "conversation_id": conversation_id, "role": role,
        "content": content, "task_id": task_id, "created_at": created_at,
    }


def list_messages(conversation_id: str, limit: int = 200) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            """SELECT id, conversation_id, role, content, task_id, created_at FROM messages
               WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?""",
            (conversation_id, limit),
        ).fetchall()
    return [
        {"id": r[0], "conversation_id": r[1], "role": r[2], "content": r[3], "task_id": r[4], "created_at": r[5]}
        for r in rows
    ]


def list_messages_for_history(conversation_id: str, limit: int = 200) -> list[dict]:
    """
    Same as list_messages, but excludes any message whose task ended in
    FAILED_PROPOSAL or FAILED_CORRECTION (i.e. Qwen Cloud itself rejected the
    request, e.g. content-moderation blocks). Prevents one flagged message
    from poisoning every future turn in the same conversation by getting
    silently re-sent as context on every subsequent call. The message still
    shows in the regular chat log (via list_messages) -- this is only for
    building the `history` payload sent back to the model.
    """
    with _connect() as conn:
        rows = conn.execute(
            """SELECT m.id, m.conversation_id, m.role, m.content, m.task_id, m.created_at
               FROM messages m
               LEFT JOIN tasks t ON m.task_id = t.id
               WHERE m.conversation_id = ?
                 AND (t.final_status IS NULL OR t.final_status NOT IN ('FAILED_PROPOSAL', 'FAILED_CORRECTION'))
               ORDER BY m.created_at ASC LIMIT ?""",
            (conversation_id, limit),
        ).fetchall()
    return [
        {"id": r[0], "conversation_id": r[1], "role": r[2], "content": r[3], "task_id": r[4], "created_at": r[5]}
        for r in rows
    ]


def search_messages(user_id: str, query: str, limit: int = 20) -> list[dict]:
    """
    Hackathon-grade 'semantic memory': FTS5 full-text relevance search over a
    user's own message history, scoped through conversations -> projects.
    No embeddings, no vector DB, no external service.

    Returns [] (rather than raising) if FTS5 isn't available in this SQLite
    build -- memory search degrades gracefully instead of 500ing.
    """
    if not FTS5_AVAILABLE:
        return []
    if not query or not query.strip():
        return []
    safe_query = query.strip().replace('"', '""')
    try:
        with _connect() as conn:
            rows = conn.execute(
                """
                SELECT m.id, m.conversation_id, m.role, m.content, m.created_at, c.title, c.project_id
                FROM messages_fts
                JOIN messages m ON m.rowid = messages_fts.rowid
                JOIN conversations c ON c.id = m.conversation_id
                WHERE messages_fts MATCH ? AND c.user_id = ?
                ORDER BY rank
                LIMIT ?
                """,
                (f'"{safe_query}"', user_id, limit),
            ).fetchall()
    except sqlite3.OperationalError:
        return []
    return [
        {
            "message_id": r[0], "conversation_id": r[1], "role": r[2],
            "content": r[3], "created_at": r[4], "conversation_title": r[5],
            "project_id": r[6],
        }
        for r in rows
    ]


def create_task(task_id: str, conversation_id: str, user_id: str, prompt: str) -> dict:
    created_at = _now()
    with _LOCK, _connect() as conn:
        print("DEBUG DB:", conn.execute("PRAGMA database_list").fetchall())
        conn.execute(
            """INSERT INTO tasks (id, conversation_id, user_id, prompt, final_status, created_at, updated_at)
               VALUES (?, ?, ?, ?, 'RUNNING', ?, ?)""",
            (task_id, conversation_id, user_id, prompt, created_at, created_at),
        )
        conn.commit()
    return {
        "id": task_id, "conversation_id": conversation_id, "user_id": user_id,
        "prompt": prompt, "final_status": "RUNNING", "created_at": created_at, "updated_at": created_at,
    }


def update_task_status(task_id: str, final_status: str) -> None:
    with _LOCK, _connect() as conn:
        print("DEBUG DB:", conn.execute("PRAGMA database_list").fetchall())
        conn.execute(
            "UPDATE tasks SET final_status = ?, updated_at = ? WHERE id = ?",
            (final_status, _now(), task_id),
        )
        conn.commit()


def get_task(task_id: str) -> dict | None:
    with _connect() as conn:
        row = conn.execute(
            """SELECT id, conversation_id, user_id, prompt, final_status, created_at, updated_at
               FROM tasks WHERE id = ?""",
            (task_id,),
        ).fetchone()
    if not row:
        return None
    return {
        "id": row[0], "conversation_id": row[1], "user_id": row[2], "prompt": row[3],
        "final_status": row[4], "created_at": row[5], "updated_at": row[6],
    }


def create_artifact(task_id: str, artifact_type: str, title: str, content: str) -> dict:
    artifact_id = new_id("art")
    created_at = _now()
    with _LOCK, _connect() as conn:
        print("DEBUG DB:", conn.execute("PRAGMA database_list").fetchall())
        conn.execute(
            """INSERT INTO artifacts (id, task_id, artifact_type, title, content, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (artifact_id, task_id, artifact_type, title, content, created_at),
        )
        conn.commit()
    return {
        "id": artifact_id, "task_id": task_id, "artifact_type": artifact_type,
        "title": title, "content": content, "created_at": created_at,
    }


def list_artifacts(task_id: str) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            """SELECT id, task_id, artifact_type, title, content, created_at
               FROM artifacts WHERE task_id = ? ORDER BY created_at ASC""",
            (task_id,),
        ).fetchall()
    return [
        {"id": r[0], "task_id": r[1], "artifact_type": r[2], "title": r[3], "content": r[4], "created_at": r[5]}
        for r in rows
    ]


def get_artifact(artifact_id: str) -> dict | None:
    with _connect() as conn:
        row = conn.execute(
            """SELECT id, task_id, artifact_type, title, content, created_at
               FROM artifacts WHERE id = ?""",
            (artifact_id,),
        ).fetchone()
    if not row:
        return None
    return {
        "id": row[0], "task_id": row[1], "artifact_type": row[2], "title": row[3],
        "content": row[4], "created_at": row[5],
    }


def delete_conversation(conversation_id: str, user_id: str) -> bool:
    """Deletes a conversation and its messages. Deliberately does NOT touch
    the audit_log or tasks tables -- the governance/compliance record is
    immutable and independent of whether the chat transcript around it still
    exists. Deleting a conversation tidies the UI; it never erases history."""
    with _LOCK, _connect() as conn:
        print("DEBUG DB:", conn.execute("PRAGMA database_list").fetchall())
        owned = conn.execute(
            "SELECT id FROM conversations WHERE id = ? AND user_id = ?",
            (conversation_id, user_id),
        ).fetchone()
        if not owned:
            return False
        conn.execute("DELETE FROM messages WHERE conversation_id = ?", (conversation_id,))
        conn.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
        conn.commit()
    return True


def delete_messages_from(conversation_id: str, user_id: str, message_id: str) -> bool:
    """Deletes the given message and every message after it (by created_at)
    in that conversation. Used for 'edit and resend' (discard everything
    downstream of the edited turn) and for a clean 'regenerate' (discard the
    stale user+assistant pair before resubmitting). Like delete_conversation,
    this only touches the messages table -- audit_log stays untouched."""
    with _LOCK, _connect() as conn:
        print("DEBUG DB:", conn.execute("PRAGMA database_list").fetchall())
        conversation = conn.execute(
            "SELECT id FROM conversations WHERE id = ? AND user_id = ?",
            (conversation_id, user_id),
        ).fetchone()
        if not conversation:
            return False
        target = conn.execute(
            "SELECT created_at FROM messages WHERE id = ? AND conversation_id = ?",
            (message_id, conversation_id),
        ).fetchone()
        if not target:
            return False
        conn.execute(
            "DELETE FROM messages WHERE conversation_id = ? AND created_at >= ?",
            (conversation_id, target[0]),
        )
        conn.commit()
    return True


def create_session(
    token: str,
    user_id: str,
    email: str,
    name: str,
    picture: str,
    expires_at: str,
) -> None:
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO sessions (
                token,
                user_id,
                email,
                name,
                picture,
                created_at,
                expires_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                token,
                user_id,
                email,
                name,
                picture,
                _now(),
                expires_at,
            ),
        )
        conn.commit()


def get_session(token: str) -> dict | None:
    with _connect() as conn:
        row = conn.execute(
            "SELECT token, user_id, email, name, picture, created_at, expires_at FROM sessions WHERE token = ?",
            (token,)
        ).fetchone()
    if not row:
        return None
    return {"token": row[0], "user_id": row[1], "email": row[2], "name": row[3], "picture": row[4], "created_at": row[5], "expires_at": row[6]}

def delete_session(token: str) -> None:
    with _connect() as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))

def cleanup_expired_sessions() -> None:
    with _connect() as conn:
        conn.execute("DELETE FROM sessions WHERE expires_at < ?", (_now(),))


def list_project_artifacts(project_id: str) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            """SELECT a.id, a.task_id, a.artifact_type, a.title, a.content, a.created_at,
                      c.id AS conversation_id, c.title AS conversation_title
               FROM artifacts a
               JOIN tasks t ON a.task_id = t.id
               JOIN conversations c ON t.conversation_id = c.id
               WHERE c.project_id = ?
               ORDER BY a.created_at DESC""",
            (project_id,),
        ).fetchall()
    return [
        {
            "id": r[0], "task_id": r[1], "artifact_type": r[2], "title": r[3],
            "content": r[4], "created_at": r[5], "conversation_id": r[6], "conversation_title": r[7],
        }
        for r in rows
    ]


def log_security_event(conversation_id: str, user_id: str, level: str, triggered_rules: list[str], reason: str) -> None:
    with _LOCK, _connect() as conn:
        conn.execute(
            """CREATE TABLE IF NOT EXISTS security_events (
                id TEXT PRIMARY KEY,
                conversation_id TEXT,
                user_id TEXT,
                level TEXT NOT NULL,
                triggered_rules TEXT NOT NULL,
                reason TEXT NOT NULL,
                created_at TEXT NOT NULL
            )"""
        )
        conn.execute(
            """INSERT INTO security_events (id, conversation_id, user_id, level, triggered_rules, reason, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (new_id("sec"), conversation_id, user_id, level, ",".join(triggered_rules), reason, _now()),
        )
        conn.commit()


def create_oauth_state(state: str, expires_at: str) -> None:
    with _LOCK, _connect() as conn:
        conn.execute(
            """CREATE TABLE IF NOT EXISTS oauth_states (
                state TEXT PRIMARY KEY,
                expires_at TEXT NOT NULL
            )"""
        )
        conn.execute(
            "INSERT OR REPLACE INTO oauth_states (state, expires_at) VALUES (?, ?)",
            (state, expires_at),
        )
        conn.commit()


def consume_oauth_state(state: str) -> bool:
    """
    Validates and deletes a state in one call -- returns True only if the
    state existed and had not expired. DB-backed so it works correctly across
    multiple gunicorn workers and survives process restarts.
    """
    with _LOCK, _connect() as conn:
        row = conn.execute(
            "SELECT expires_at FROM oauth_states WHERE state = ?", (state,)
        ).fetchone()
        conn.execute("DELETE FROM oauth_states WHERE state = ?", (state,))
        conn.commit()
    if not row:
        return False
    return row[0] >= _now()


def cleanup_expired_oauth_states() -> None:
    with _LOCK, _connect() as conn:
        conn.execute("DELETE FROM oauth_states WHERE expires_at < ?", (_now(),))
        conn.commit()


def update_artifact_content(artifact_id: str, content: str) -> None:
    with _LOCK, _connect() as conn:
        conn.execute("UPDATE artifacts SET content = ? WHERE id = ?", (content, artifact_id))
        conn.commit()
