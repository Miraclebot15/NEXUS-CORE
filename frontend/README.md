# NEXUS CORE — Frontend

The real Command Center UI for NEXUS CORE, wired to the actual FastAPI
backend (`nexus-core/`). No mocked chat transport, no simulated governance
loop, no fake image generation — everything either calls a real backend
endpoint or is explicitly marked disabled with a "coming soon" label.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in `NEXT_PUBLIC_NEXUS_API_URL` (your running backend) and the Clerk
   keys. The backend only enforces auth once `CLERK_ISSUER` is set on *its*
   side too -- use the same Clerk application on both.

3. **Run the backend first**, then:
   ```bash
   npm run dev
   ```

## Feature list (all real, all wired to the actual backend)

- **Live orchestration streaming** via SSE (`lib/api-client.ts` -> `/api/task/stream`)
- **Real governance visibility**: BLOCKED verdicts, triggered rules, and
  JANE's correction are all shown as they actually happen -- never smoothed over
- **The Chain Rail**: a hash-linked step timeline pulling real `record_hash`
  values off the backend's audit chain (`thinking-pill.tsx`)
- **Projects & conversations**, created lazily -- a new chat only becomes a
  real backend record on first send, auto-titled from that message (matches
  ChatGPT/Claude behavior; no empty "New Chat" clutter)
- **Delete conversation** (sidebar, two-click confirm) -- disabled while
  that conversation is actively streaming, to avoid orphaning messages
  mid-task
- **Edit and resend** any previous user message -- discards that message and
  everything after it, then resubmits (`chat-message.tsx`)
- **Real regenerate** -- deletes the stale user+assistant pair first, then
  resubmits, instead of duplicating your own message in the transcript
- **Multi-turn memory reaching the model**: the backend now sends ELLA real
  prior conversation turns, not just the current prompt in isolation
- **Session persistence**: last-viewed project/conversation restored from
  localStorage on refresh (a partial fix -- true `/c/[id]` deep-linking
  would be the complete version; see Known limitations)
- **Memory search** (`Cmd+K`) via real FTS5 full-text search
- **Governance Logs** viewer -- the full real audit trail with chain-validity status
- **Research artifacts** -- real DuckDuckGo results, with an honest empty
  state when the free API genuinely has nothing (not a silent blank box)
- **"Stop" actually stops the backend**, not just the browser's view of it

## Known limitations (flagged honestly)

- **No URL-based routing.** Everything lives on `/` with client state.
  localStorage persistence covers "don't lose my place on refresh," but
  there's no shareable/bookmarkable link per conversation. The real fix is
  Next.js dynamic routes (`/c/[conversationId]`) -- a bigger refactor than
  fit in this pass.
- **Model picker is cosmetic** -- see the comment in `lib/models.ts`.
- **Voice input, file/image upload are disabled**, not removed -- visible in
  the composer but marked "not yet supported."
- **Bookmark and branch-conversation are disabled** for the same reason.
- **No syntax highlighting in code blocks** -- language label and copy
  button work, but no Prism/Shiki. Not added without the ability to verify
  a new dependency in this environment.
- **Artifacts overview, Sandbox Sessions, Team Workspace** nav items are
  shown but disabled ("Soon") -- no backend support exists for any of them.
- **True semantic memory** (embeddings) isn't implemented -- memory search
  is real FTS5 keyword/relevance search, not vector similarity.
- **No automated tests** (unit or e2e) on either side of this project,
  beyond the manual verification run during development.
- **No accessibility audit** -- the overlays (memory search, governance
  logs) don't trap focus; no `aria-live` region announces streamed text.

## Structure

```
app/
  layout.tsx              Root layout: ClerkProvider, IBM Plex fonts
  page.tsx                Entry point (renders WorkspaceShell)
  sign-in/, sign-up/       Clerk auth pages
  globals.css              Design tokens + utilities (no gradients)
middleware.ts              Clerk route protection
lib/
  api-client.ts             Typed REST + SSE client for the real backend
  use-nexus-workspace.ts    Core state hook: projects/conversations/messages/
                            streaming/delete/edit/regenerate/localStorage
  orchestration.ts           Real orchestration data model, built from SSE events
  models.ts                   Shared model-picker constants
components/
  ambient-background.tsx      Schematic grid + single-hue spotlight
  workspace/
    workspace-shell.tsx         Top-level layout + wiring
    sidebar.tsx                  Projects, conversations (+ delete), audit status
    top-bar.tsx                   Title/rename, model picker, connection badge
    composer.tsx                   Message input, reasoning-mode hints
    chat-message.tsx                Message bubble, edit-and-resend, verdict styling
    thinking-pill.tsx                The "Chain Rail" -- live hash-linked timeline
    orchestration-actions.tsx        Live step chips while streaming
    action-indicator.tsx              Single step chip (verdict-colored)
    context-panel.tsx                  Per-turn detail: reasoning/research/execution/governance/artifacts
    memory-search.tsx                   Cmd+K search overlay (real FTS5)
    governance-logs.tsx                  Full audit trail viewer (real /api/audit)
    welcome.tsx                           Empty-state with real suggested prompts (incl. governance break-test)
    nexus-mark.tsx                         The real brand mark (SVG, solid color)
    markdown.tsx, menu.tsx                Unmodified utility components
```
