/**
 * NEXUS CORE :: lib/api-client.ts
 *
 * Typed client for the real FastAPI backend. Every function here maps to an
 * endpoint that actually exists in `nexus-core/main.py` -- nothing in this
 * file is mocked or simulated.
 *
 * Auth: pass a `getToken` function (Clerk's `useAuth().getToken`). If it
 * resolves to null/undefined (auth disabled backend-side, or Clerk not
 * configured yet), requests are simply sent without an Authorization header,
 * which matches the backend's own demo-mode fallback.
 *
 * SSE: the browser's native `EventSource` cannot send custom headers, so it
 * can't carry a Clerk bearer token. This client instead uses `fetch` with a
 * streamed response body and parses Server-Sent Events manually.
 */

const API_BASE = (process.env.NEXT_PUBLIC_NEXUS_API_URL || 'http://localhost:8000').replace(
  /\/$/,
  '',
)

export type GetToken = () => Promise<string | null | undefined>

// --- Data model types (mirrors backend models.py) --------------------------

export interface ProjectOut {
  id: string
  user_id: string
  name: string
  created_at: string
}

export interface ConversationOut {
  id: string
  project_id: string
  user_id: string
  title: string
  created_at: string
}

export interface MessageOut {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  task_id: string | null
  created_at: string
}

export interface ArtifactOut {
  id: string
  task_id: string
  artifact_type: string
  title: string
  content: string
  created_at: string
}

export interface MessageSearchResult {
  message_id: string
  conversation_id: string
  role: string
  content: string
  created_at: string
  conversation_title: string
  project_id: string
}

export interface HealthResponse {
  status: string
  model: string
  base_url: string
  chain_valid: boolean
  auth_enabled: boolean
}

/** Matches backend models.py `TaskTraceEvent`, streamed one per SSE event. */
export interface TaskStreamEvent {
  stage: string
  label: string
  detail: unknown
  timestamp: string
  record_hash: string
}

export class NexusApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'NexusApiError'
    this.status = status
  }
}

async function authHeaders(getToken?: GetToken): Promise<Record<string, string>> {
  if (!getToken) return {}
  try {
    const token = await getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; getToken?: GetToken } = {},
): Promise<T> {
  const { method = 'GET', body, getToken } = options
  const headers: Record<string, string> = {
    ...(await authHeaders(getToken)),
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    let detail = res.statusText
    try {
      const json = await res.json()
      detail = json.detail || detail
    } catch {
      /* response wasn't JSON */
    }
    throw new NexusApiError(detail, res.status)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

// --- Projects ---------------------------------------------------------------

export function listProjects(getToken?: GetToken) {
  return request<ProjectOut[]>('/api/projects', { getToken })
}

export function createProject(name: string, getToken?: GetToken) {
  return request<ProjectOut>('/api/projects', { method: 'POST', body: { name }, getToken })
}

// --- Conversations -----------------------------------------------------------

export function listConversations(projectId: string, getToken?: GetToken) {
  return request<ConversationOut[]>(`/api/projects/${projectId}/conversations`, { getToken })
}

export function createConversation(projectId: string, title: string, getToken?: GetToken) {
  return request<ConversationOut>(`/api/projects/${projectId}/conversations`, {
    method: 'POST',
    body: { title },
    getToken,
  })
}

export function renameConversation(conversationId: string, title: string, getToken?: GetToken) {
  return request<ConversationOut>(`/api/conversations/${conversationId}`, {
    method: 'PATCH',
    body: { title },
    getToken,
  })
}

export function deleteConversation(conversationId: string, getToken?: GetToken) {
  return request<{ deleted: boolean }>(`/api/conversations/${conversationId}`, {
    method: 'DELETE',
    getToken,
  })
}

export function deleteMessagesFrom(conversationId: string, messageId: string, getToken?: GetToken) {
  return request<{ deleted: boolean }>(
    `/api/conversations/${conversationId}/messages/${messageId}`,
    { method: 'DELETE', getToken },
  )
}

export function listMessages(conversationId: string, getToken?: GetToken) {
  return request<MessageOut[]>(`/api/conversations/${conversationId}/messages`, { getToken })
}

// --- Memory search -------------------------------------------------------------

export function searchMessages(query: string, getToken?: GetToken, limit = 20) {
  const params = new URLSearchParams({ q: query, limit: String(limit) })
  return request<MessageSearchResult[]>(`/api/messages/search?${params}`, { getToken })
}

// --- Artifacts -------------------------------------------------------------

export function listTaskArtifacts(taskId: string, getToken?: GetToken) {
  return request<ArtifactOut[]>(`/api/tasks/${taskId}/artifacts`, { getToken })
}

export function getArtifact(artifactId: string, getToken?: GetToken) {
  return request<ArtifactOut>(`/api/artifacts/${artifactId}`, { getToken })
}

// --- Health / audit ----------------------------------------------------------

export function getHealth() {
  return request<HealthResponse>('/api/health')
}

export function getAudit(limit = 200, getToken?: GetToken) {
  return request<{ chain_valid: boolean; records: unknown[] }>(
    `/api/audit?limit=${limit}`,
    { getToken },
  )
}

// --- Streaming task pipeline (SSE) ------------------------------------------

/**
 * Consumes GET /api/task/stream and yields one TaskStreamEvent per SSE
 * message, in order, as they arrive -- no buffering until the end.
 */
export async function* streamTask(
  params: { prompt: string; conversationId?: string },
  options: { getToken?: GetToken; signal?: AbortSignal } = {},
): AsyncGenerator<TaskStreamEvent, void, void> {
  const query = new URLSearchParams({ prompt: params.prompt })
  if (params.conversationId) query.set('conversation_id', params.conversationId)

  const headers: Record<string, string> = {
    Accept: 'text/event-stream',
    ...(await authHeaders(options.getToken)),
  }

  const res = await fetch(`${API_BASE}/api/task/stream?${query}`, {
    headers,
    signal: options.signal,
  })

  if (!res.ok || !res.body) {
    let detail = res.statusText
    try {
      const json = await res.json()
      detail = json.detail || detail
    } catch {
      /* not JSON */
    }
    throw new NexusApiError(detail, res.status)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // SSE messages are separated by a blank line.
      let boundary: number
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)

        let eventName = 'message'
        const dataLines: string[] = []
        for (const line of rawEvent.split('\n')) {
          if (line.startsWith('event:')) eventName = line.slice(6).trim()
          else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
        }
        const dataStr = dataLines.join('\n')

        if (eventName === 'STREAM_END') return
        if (!dataStr) continue

        let parsed: unknown
        try {
          parsed = JSON.parse(dataStr)
        } catch {
          continue
        }

        if (eventName === 'STREAM_ERROR') {
          const errObj = parsed as { error?: string }
          throw new Error(errObj.error || 'Stream error')
        }

        yield parsed as TaskStreamEvent
      }
    }
  } finally {
    reader.releaseLock()
  }
}
