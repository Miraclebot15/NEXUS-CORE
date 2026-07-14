'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as api from './api-client'
import type { GetToken } from './api-client'
import { applyStreamEvent, createTimeline, parseArtifactContent, type Timeline } from './orchestration'

const LAST_PROJECT_KEY = 'nexus:last-project-id'
const LAST_CONVERSATION_KEY = 'nexus:last-conversation-id'

function readStored(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(key)
    return typeof value === 'string' ? value : null
  } catch {
    return null
  }
}

function writeStored(key: string, value: string | null) {
  if (typeof window === 'undefined') return
  try {
    if (value && typeof value === 'string') {
      window.localStorage.setItem(key, value)
    } else {
      window.localStorage.removeItem(key) 
    }
  } catch {
    console.warn('Failed to access localStorage')
  }
}

export interface NexusMessage {
  id: string
  role: 'user' | 'assistant'
  parts: { type: 'text'; text: string }[]
  taskId?: string | null
  artifacts?: any[]
  imageUrl?: string
}

export type WorkspaceStatus = 'idle' | 'loading' | 'streaming' | 'error'

function textMessage(
  id: string,
  role: 'user' | 'assistant',
  text: string,
  taskId?: string | null,
): NexusMessage {
  return { id, role, parts: [{ type: 'text', text }], taskId }
}

function messageFromApi(m: api.MessageOut): NexusMessage {
  return textMessage(m.id, m.role, m.content, m.task_id)
}

/** Chooses a short, honest line to show while a task streams, before the
 *  full assistant message is refetched from the backend on completion. */
function describeInProgress(timeline: Timeline): string {
  const last = timeline.events[timeline.events.length - 1]
  if (!last) return 'Working\u2026'
  const STAGE_LABELS: Record<string, string> = {
    INTAKE: 'Receiving task\u2026',
    ELLA_PROPOSE: 'Planning\u2026',
    GOVERNANCE_CHECK: 'Checking governance\u2026',
    EXECUTION: 'Executing\u2026',
    SYNTHESIS: 'Generating answer\u2026',
    TERMINAL: 'Finishing up\u2026',
  }
  return STAGE_LABELS[last.stage] ?? last.label ?? 'Working\u2026'
}

/** Derives a short conversation title from the first message, the way
 *  ChatGPT/Claude auto-title a "New Chat" the moment you send something --
 *  no extra model call, just a truncation of the actual prompt. */
function deriveTitle(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= 48) return clean || 'New Chat'
  return `${clean.slice(0, 48).trimEnd()}\u2026`
}

export function useNexusWorkspace(getToken?: GetToken) {
  const [projects, setProjects] = useState<api.ProjectOut[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<api.ConversationOut[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<NexusMessage[]>([])
  const [timelines, setTimelines] = useState<Record<string, Timeline>>({})
  const [status, setStatus] = useState<WorkspaceStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [health, setHealth] = useState<api.HealthResponse | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const streamingAssistantIdRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      // Clean up any pending streams on unmount
      abortRef.current?.abort()
    }
  }, [])
  // Kept in a ref (not state) so `send`, called immediately after `newChat`,
  // always sees the latest value without waiting on a state-update render.
  const activeConversationRef = useRef<string | null>(null)

  const setActiveConversation = useCallback((id: string | null) => {
    activeConversationRef.current = id
    setActiveConversationId(id)
    writeStored(LAST_CONVERSATION_KEY, id)
  }, [])

  // --- Health polling (drives the connection/model badge) -----------------
  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      try {
        const h = await api.getHealth()
        if (!cancelled) setHealth(h)
      } catch {
        if (!cancelled) setHealth(null)
      }
    }
    poll()
    const interval = setInterval(poll, 15000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  // --- Bootstrap: load or create a default project. Conversations are
  // created lazily on first send (see `send` below) -- matching ChatGPT/
  // Claude's behavior of not cluttering history with empty "New Chat"
  // entries the user never actually used. -----------------------------
  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      setStatus('loading')
      try {
        let projectList = await api.listProjects(getToken)
        if (projectList.length === 0) {
          const created = await api.createProject('Quick Tasks', getToken)
          projectList = [created]
        }
        if (cancelled) return
        setProjects(projectList)

        const storedProjectId = readStored(LAST_PROJECT_KEY)
        const project =
          projectList.find((p) => p.id === storedProjectId) ?? projectList[0]
        setActiveProjectId(project.id)
        writeStored(LAST_PROJECT_KEY, project.id)

        const convoList = await api.listConversations(project.id, getToken)
        if (cancelled) return
        setConversations(convoList)

        if (convoList.length > 0) {
          const storedConversationId = readStored(LAST_CONVERSATION_KEY)
          const convo =
            convoList.find((c) => c.id === storedConversationId) ?? convoList[0]
          setActiveConversation(convo.id)
          const msgs = await api.listMessages(convo.id, getToken)
          if (cancelled) return
          setMessages(msgs.map(messageFromApi))
        } else {
          setActiveConversation(null)
          setMessages([])
        }
        setStatus('idle')
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load workspace.')
          setStatus('error')
        }
      }
    }
    bootstrap()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshConversations = useCallback(
    async (projectId: string) => {
      const list = await api.listConversations(projectId, getToken)
      setConversations(list)
      return list
    },
    [getToken],
  )

  const selectConversation = useCallback(
    async (conversationId: string) => {
      setStatus('loading')
      setActiveConversation(conversationId)
      try {
        const msgs = await api.listMessages(conversationId, getToken)
        setMessages(msgs.map(messageFromApi))
        setTimelines({})
        setStatus('idle')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load conversation.')
        setStatus('error')
      }
    },
    [getToken, setActiveConversation],
  )

  /** Resets to a blank, not-yet-persisted "new chat" -- no backend call
   *  happens until the user actually sends a message. */
  const newChat = useCallback(() => {
    setActiveConversation(null)
    setMessages([])
    setTimelines({})
    setError(null)
  }, [setActiveConversation])

  const renameConversation = useCallback(
    async (conversationId: string, title: string) => {
      await api.renameConversation(conversationId, title, getToken)
      if (activeProjectId) await refreshConversations(activeProjectId)
    },
    [activeProjectId, getToken, refreshConversations],
  )

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      await api.deleteConversation(conversationId, getToken)
      if (activeProjectId) {
        const list = await refreshConversations(activeProjectId)
        if (activeConversationRef.current === conversationId) {
          if (list.length > 0) {
            await selectConversation(list[0].id)
          } else {
            newChat()
          }
        }
      }
    },
    [activeProjectId, getToken, refreshConversations, selectConversation, newChat],
  )

  const createProject = useCallback(
    async (name: string) => {
      const created = await api.createProject(name, getToken)
      setProjects((prev) => [created, ...prev])
      setActiveProjectId(created.id)
      writeStored(LAST_PROJECT_KEY, created.id)
      setConversations([])
      newChat()
    },
    [getToken, newChat],
  )

  const selectProject = useCallback(
    async (projectId: string) => {
      setStatus('loading')
      setActiveProjectId(projectId)
      writeStored(LAST_PROJECT_KEY, projectId)
      try {
        const convoList = await api.listConversations(projectId, getToken)
        setConversations(convoList)
        if (convoList.length > 0) {
          const convo = convoList[0]
          setActiveConversation(convo.id)
          const msgs = await api.listMessages(convo.id, getToken)
          setMessages(msgs.map(messageFromApi))
        } else {
          setActiveConversation(null)
          setMessages([])
        }
        setTimelines({})
        setStatus('idle')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to switch project.')
        setStatus('error')
      }
    },
    [getToken, setActiveConversation],
  )

  // --- Core: submit a task, stream the real pipeline -----------------------
  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || status === 'streaming') return

      // Lazily create the conversation on first send, titled from the
      // actual message -- no empty "New Chat" clutter, no placeholder title.
      let conversationId = activeConversationRef.current
      if (!conversationId) {
        if (!activeProjectId) return
        const created = await api.createConversation(activeProjectId, deriveTitle(text), getToken)
        conversationId = created.id
        setActiveConversation(created.id)
        await refreshConversations(activeProjectId)
      }

      const userMsgId = `local-user-${Date.now()}`
      const assistantMsgId = `local-assistant-${Date.now()}`
      streamingAssistantIdRef.current = assistantMsgId

      setMessages((prev) => [
        ...prev,
        textMessage(userMsgId, 'user', text),
        textMessage(assistantMsgId, 'assistant', ''),
      ])

      let timeline = createTimeline(text)
      setTimelines((prev) => ({ ...prev, [assistantMsgId]: timeline }))
      setStatus('streaming')
      setError(null)

      const controller = new AbortController()
      abortRef.current = controller

      try {
        for await (const event of api.streamTask(
          { prompt: text, conversationId },
          { getToken, signal: controller.signal },
        )) {
          timeline = applyStreamEvent(timeline, event)
          const snapshot = timeline
          setTimelines((prev) => ({ ...prev, [assistantMsgId]: snapshot }))
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? textMessage(assistantMsgId, 'assistant', describeInProgress(snapshot), snapshot.taskId)
                : m,
            ),
          )
        }

          try {
            // Stream finished: refetch the authoritative conversation history so
            // the final assistant message matches exactly what the backend
            // persisted (rather than trusting a client-reconstructed string).
            const msgs = await api.listMessages(conversationId, getToken)
            const mappedMsgs = msgs.map(messageFromApi)

            const realAssistant = [...mappedMsgs]
              .reverse()
              .find((m) => m.role === 'assistant')

            if (realAssistant && timeline.taskId) {
              try {
                const artifacts = await api.listTaskArtifacts(timeline.taskId, getToken)
                const imageArtifact = artifacts.find((a) => a.artifact_type === 'image')

                if (imageArtifact) {
                  const content = parseArtifactContent(imageArtifact.content)
                  if (content && typeof content.url === 'string') {
                    realAssistant.imageUrl = content.url
                  }
                }
              } catch (artifactErr) {
                console.error('Failed to load artifacts:', artifactErr)
              }
            }

            setMessages(mappedMsgs)
          } catch (refreshErr) {
            console.error('Failed to refresh messages after stream:', refreshErr)
            // Fall back to keeping the local messages if refresh fails
            setMessages(prev => [...prev])
          }

          if (realAssistant) {
            setTimelines((prev) => ({
              ...prev,
              [realAssistant.id]: prev[assistantMsgId] ?? timeline,
            }))
          }

          setMessages(mappedMsgs)


          if (timeline.taskId) {
            const artifacts = await api.listTaskArtifacts(timeline.taskId, getToken)

            setTimelines((prev) => {
              const targetId = realAssistant?.id ?? assistantMsgId

              return {
                ...prev,
                [targetId]: {
                  ...(prev[targetId] ?? timeline),
                  artifacts: artifacts.map((a) => ({
                    id: a.id,
                    artifactType: a.artifact_type,
                    title: a.title,
                    content: parseArtifactContent(a.content),
                  })),
                },
              }
            })

            const imageArtifact = artifacts.find((a) => a.artifact_type === 'image')

            if (imageArtifact) {
              const content = parseArtifactContent(imageArtifact.content)

              setMessages((prev) =>
                prev.map((m) =>
                  m.id === realAssistant?.id
                    ? { ...m, imageUrl: String(content.url) }
                    : m
                )
              )
            }
          }

          if (activeProjectId) await refreshConversations(activeProjectId)
          setStatus('idle')
      } catch (err) {
        if (controller.signal.aborted) {
          setStatus('idle')
          return
        }
        setError(err instanceof Error ? err.message : 'The orchestration stream failed.')
        setStatus('error')
      } finally {
        abortRef.current = null
        streamingAssistantIdRef.current = null
      }
    },
    [status, activeProjectId, getToken, refreshConversations, setActiveConversation],
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  /** True regenerate: removes the stale user+assistant pair first, then
   *  resubmits -- rather than appending a second, duplicate copy of the
   *  user's own message (which the naive "just call send() again" approach
   *  would produce). The audit log is untouched either way; only the visible
   *  chat transcript is cleaned up. */
  const regenerate = useCallback(async () => {
    if (!activeConversationRef.current || status === 'streaming') return
    let lastUserIdx = -1
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIdx = i
        break
      }
    }
    if (lastUserIdx === -1) return
    const lastUser = messages[lastUserIdx]
    const text = lastUser.parts.map((p) => p.text).join('')

    if (!lastUser.id.startsWith('local-')) {
      await api.deleteMessagesFrom(activeConversationRef.current, lastUser.id, getToken)
    }
    setMessages((prev) => prev.slice(0, lastUserIdx))
    send(text)
  }, [messages, status, getToken, send])

  /** Edits a previous user message and resends it, discarding that message
   *  and everything after it -- the same "edit and branch forward" pattern
   *  ChatGPT and Claude both use. */
  const editAndResend = useCallback(
    async (messageId: string, newText: string) => {
      if (!activeConversationRef.current || status === 'streaming' || !newText.trim()) return
      const idx = messages.findIndex((m) => m.id === messageId)
      if (idx === -1) return

      if (!messageId.startsWith('local-')) {
        await api.deleteMessagesFrom(activeConversationRef.current, messageId, getToken)
      }
      setMessages((prev) => prev.slice(0, idx))
      send(newText)
    },
    [messages, status, getToken, send],
  )

  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i].id
    }
    return null
  }, [messages])

  return {
    projects,
    activeProjectId,
    conversations,
    activeConversationId,
    messages,
    timelines,
    status,
    error,
    health,
    lastAssistantId,
    send,
    stop,
    regenerate,
    editAndResend,
    selectConversation,
    newChat,
    renameConversation,
    deleteConversation,
    createProject,
    selectProject,
  }
}
