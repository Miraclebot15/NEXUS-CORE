# NEXUS CORE — Backend

A governance-first AI OS. Treats LLMs as untrusted probabilistic engines:
every AI-proposed plan passes through a deterministic, fail-closed policy
engine before anything executes.

## Pipeline

```
User Task (via SSE)
   |
   v
ELLA (Qwen qwen-turbo) -- proposes a structured JSON execution plan,
                           with real prior-conversation context
   |
   v
Governance Engine (deterministic Python, fail-closed)
   |
   +-- APPROVED --------------------------------> Simulated Sandbox Execution
   |                                                (real for web_search)
   +-- BLOCKED
         |
         v
       JANE (Qwen qwen-turbo) -- rewrites the plan to be compliant
         |
         v
       Governance re-checks (max N correction attempts, default 2)
         |
         +-- APPROVED -------------------------> Simulated Sandbox Execution
         +-- still BLOCKED --------------------> Task REJECTED

Every stage is streamed to the client as an SSE event AND written to a
hash-chained, append-only SQLite audit log in the same instant. If the
client disconnects (e.g. the user hits Stop), the pipeline stops advancing
rather than running to completion regardless.
```

## Setup

1. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Required: QWEN_API_KEY
   # Optional: CLERK_ISSUER to enforce real auth (leave blank to run standalone
   # as DEMO_USER_ID)
   ```

3. **Run the server**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   `nexus_audit.db` (SQLite) is created automatically on first launch. If the
   SQLite build lacks FTS5, the app still starts — memory search just
   returns empty results instead of crashing (see Known limitations).

## API Reference

### Auth
`Authorization: Bearer <clerk_jwt>` once `CLERK_ISSUER` is set. Until then,
every request is treated as `DEMO_USER_ID` and no header is required.

### Projects / Conversations / Messages
| Method | Path | Description |
|---|---|---|
| POST | `/api/projects` | Create a project (`{"name": str}`) |
| GET | `/api/projects` | List the caller's projects |
| POST | `/api/projects/{project_id}/conversations` | Create a conversation (`{"title": str}`) |
| GET | `/api/projects/{project_id}/conversations` | List conversations in a project |
| GET | `/api/conversations/{conversation_id}/messages` | Full message history |
| PATCH | `/api/conversations/{conversation_id}` | Rename a conversation |
| DELETE | `/api/conversations/{conversation_id}` | Delete a conversation + its messages (audit log untouched) |
| DELETE | `/api/conversations/{conversation_id}/messages/{message_id}` | Delete a message and everything after it (used for edit-and-resend / regenerate) |

### Orchestration (SSE)
| Method | Path | Description |
|---|---|---|
| GET | `/api/task/stream?prompt=...&conversation_id=...` | Streams pipeline stage events. `conversation_id` optional -- omit to auto-provision. |

Event names match the pipeline stage: `INTAKE`, `ELLA_PROPOSE`,
`GOVERNANCE_CHECK`, `JANE_CORRECT`, `GOVERNANCE_RECHECK`, `EXECUTION`,
`ARTIFACT_CREATED`, `TERMINAL`, plus `STREAM_ERROR` / `STREAM_END`. Each
event's JSON now includes `record_hash` (the audit chain hash for that
step), so a client can render a real hash-linked timeline.

### Memory / Artifacts / Audit / Health
| Method | Path | Description |
|---|---|---|
| GET | `/api/messages/search?q=...` | FTS5 relevance search (returns `[]` if FTS5 unavailable) |
| GET | `/api/tasks/{task_id}/artifacts` | Artifacts produced by a task |
| GET | `/api/artifacts/{artifact_id}` | Fetch a single artifact |
| GET | `/api/audit` | Full audit trail + hash-chain validity flag |
| GET | `/api/health` | System status, model, chain validity, auth mode |

## Design notes / safety guarantees

- **Fail-closed governance**: any internal exception in the policy engine
  defaults to `BLOCKED`, never `APPROVED`.
- **Bounded correction loop**: JANE gets at most `MAX_CORRECTION_ATTEMPTS`
  (default 2) tries before hard-rejection.
- **Defensive JSON parsing**: fence-stripping -> direct parse -> brace-
  matching extraction -> Pydantic validation, with retries.
- **Multi-turn context**: ELLA receives the last 20 messages of real
  conversation history, not just the current prompt in isolation.
- **No real side effects** except `web_search`, which is real and read-only.
- **Tamper-evident audit log**: every record stores
  `sha256(prev_hash + content)`; deleting a conversation or message only
  touches the `conversations`/`messages` tables -- the audit log is
  independent and permanent.
- **Client-disconnect aware streaming**: hitting Stop actually stops the
  pipeline from advancing further (can't interrupt a Qwen call already in
  flight, but nothing after it runs).

## Known limitations

- **Model picker is cosmetic** on the frontend -- `/api/task/stream` doesn't
  yet accept a per-request model override; it always uses `QWEN_MODEL`.
- **FTS5 dependency**: memory search needs SQLite compiled with FTS5. Most
  modern Python builds have it; if not, `search_messages()` degrades to `[]`
  instead of crashing. Verify with:
  `python3 -c "import sqlite3; sqlite3.connect(':memory:').execute('CREATE VIRTUAL TABLE t USING fts5(x)')"`
- **`web_search` is a free, low-quality API** (DuckDuckGo Instant Answer),
  built for definitions/named entities, not general search. Good demo
  queries: "Server-Sent Events", "Python programming language". Open-ended
  queries often return a clear "no instant answer" message rather than
  fabricated content -- that's intentional, not a bug.
- **No per-request rate limiting.** Fine for a hackathon demo; add before
  any real deployment.
