'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, RotateCcw, TriangleAlert, X } from 'lucide-react'
import { AmbientBackground } from '@/components/ambient-background'
import { useNexusWorkspace } from '@/lib/use-nexus-workspace'
import { DEFAULT_MODEL_ID } from '@/lib/models'
import { Sidebar } from './sidebar'
import { TopBar, type Connection } from './top-bar'
import { ContextPanel } from './context-panel'
import { ArtifactPanel } from './artifact-panel'
import { Composer } from './composer'
import { ChatMessage } from './chat-message'
import { Welcome } from './welcome'
import { MemorySearch } from './memory-search'
import { GovernanceLogs } from './governance-logs'
import type { Timeline, ArtifactItem } from '@/lib/orchestration'

type ReasoningMode = 'standard' | 'deep-research' | 'thinking' | 'brainstorming' | 'learning'

export function WorkspaceShell() {
  // Auth bypassed for demo -- no Clerk dependency.
  const getTokenFn = useCallback(async () => null, [])

  const workspace = useNexusWorkspace(getTokenFn)
  const {
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
  } = workspace

  // --- Model + Reasoning mode (UI state only -- see lib/models.ts) -------
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID)
  const [reasoningMode, setReasoningMode] = useState<ReasoningMode>('standard')

  const [desktopSidebar, setDesktopSidebar] = useState(true)
  const [mobileNav, setMobileNav] = useState(false)
  const [contextOpen, setContextOpen] = useState(false)
  const [contextTimelineId, setContextTimelineId] = useState<string | null>(null)
  const [artifactOpen, setArtifactOpen] = useState(false)
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactItem | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [governanceLogsOpen, setGovernanceLogsOpen] = useState(false)

  // --- Resilience state ----------------------------------------------------
  const [browserOnline, setBrowserOnline] = useState(true)
  const [queued, setQueued] = useState<string[]>([])
  const [interruptedId, setInterruptedId] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [showJump, setShowJump] = useState(false)
  const stickToBottom = useRef(true)

  const isBusy = status === 'streaming'

  const connection: Connection = !browserOnline ? 'offline' : health === null ? 'reconnecting' : 'online'

  // Real browser connectivity awareness (still meaningful: fetches genuinely
  // fail offline even though the "backend reachable" signal comes from the
  // health poll in useNexusWorkspace).
  useEffect(() => {
    const goOnline = () => setBrowserOnline(true)
    const goOffline = () => setBrowserOnline(false)
    setBrowserOnline(navigator.onLine)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  // Global Cmd/Ctrl+K to open memory search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const dispatch = useCallback(
    (text: string) => {
      setInterruptedId(null)
      stickToBottom.current = true
      send(text)
    },
    [send],
  )

  const handleSend = useCallback(
    (text: string) => {
      if (connection === 'offline') {
        setQueued((q) => [...q, text])
        return
      }
      dispatch(text)
    },
    [connection, dispatch],
  )

  // Flush queued messages one at a time once back online and idle.
  useEffect(() => {
    if (connection !== 'online' || isBusy || queued.length === 0) return
    const [next, ...rest] = queued
    setQueued(rest)
    dispatch(next)
  }, [connection, isBusy, queued, dispatch])

  const handleStop = useCallback(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        setInterruptedId(messages[i].id)
        break
      }
    }
    stop()
  }, [messages, stop])

  const handleRetry = useCallback(() => {
    setInterruptedId(null)
    regenerate()
  }, [regenerate])

  const handleNewChat = useCallback(() => {
    newChat()
    setQueued([])
    setInterruptedId(null)
    setContextOpen(false)
    setMobileNav(false)
  }, [newChat])

  const handleRenameConversation = useCallback(() => {
    if (!activeConversationId) return
    const current = conversations.find((c) => c.id === activeConversationId)
    const next = window.prompt('Rename conversation', current?.title ?? '')
    if (next && next.trim()) renameConversation(activeConversationId, next.trim())
  }, [activeConversationId, conversations, renameConversation])

  const handleDeleteChat = useCallback(
    (id: string) => {
      if (id === activeConversationId) {
        setInterruptedId(null)
        setContextOpen(false)
      }
      deleteConversation(id)
    },
    [activeConversationId, deleteConversation],
  )

  const removeQueued = useCallback((idx: number) => {
    setQueued((q) => q.filter((_, i) => i !== idx))
  }, [])

  // Smart scroll anchoring
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior })
    stickToBottom.current = true
    setShowJump(false)
  }, [])

  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    const near = distance < 120
    stickToBottom.current = near
    setShowJump(!near && el.scrollHeight > el.clientHeight + 200)
  }, [])

  useEffect(() => {
    if (stickToBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const chats = useMemo(
    () => conversations.map((c) => ({ id: c.id, title: c.title })),
    [conversations],
  )
  const activeTitle = conversations.find((c) => c.id === activeConversationId)?.title ?? 'New Chat'

  const latestAssistantTimeline: Timeline | undefined = lastAssistantId
    ? timelines[lastAssistantId]
    : undefined
  const openContextTimeline = contextTimelineId ? timelines[contextTimelineId] : latestAssistantTimeline

  const openContextFor = useCallback((messageId: string) => {
    setContextTimelineId(messageId)
    setContextOpen(true)
  }, [])

  const openArtifact = useCallback((artifact: ArtifactItem) => {
    setSelectedArtifact(artifact)
    setArtifactOpen(true)
  }, [])

  return (
    <div className="relative flex h-dvh w-full overflow-hidden text-foreground">
      <AmbientBackground />

      <MemorySearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onOpenConversation={selectConversation}
        getToken={getTokenFn}
      />
      <GovernanceLogs
        open={governanceLogsOpen}
        onClose={() => setGovernanceLogsOpen(false)}
        getToken={getTokenFn}
      />

      {/* Desktop sidebar */}
      <AnimatePresence initial={false}>
        {desktopSidebar && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 288, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="z-20 hidden shrink-0 overflow-hidden border-r border-border glass lg:block"
          >
            <div className="h-full w-72">
              <Sidebar
                projects={projects}
                activeProjectId={activeProjectId}
                onSelectProject={selectProject}
                onCreateProject={createProject}
                chats={chats}
                activeChatId={activeConversationId}
                onNewChat={handleNewChat}
                onSelectChat={selectConversation}
                onDeleteChat={handleDeleteChat}
                disableDeleteId={isBusy ? activeConversationId : null}
                onCollapse={() => setDesktopSidebar(false)}
                onOpenSearch={() => setSearchOpen(true)}
                onOpenGovernanceLogs={() => setGovernanceLogsOpen(true)}
                chainValid={health?.chain_valid ?? null}
              />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileNav && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNav(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="fixed inset-y-0 left-0 z-50 w-72 border-r border-border glass-strong lg:hidden"
            >
              <Sidebar
                projects={projects}
                activeProjectId={activeProjectId}
                onSelectProject={selectProject}
                onCreateProject={createProject}
                chats={chats}
                activeChatId={activeConversationId}
                onNewChat={handleNewChat}
                onSelectChat={(id) => {
                  selectConversation(id)
                  setMobileNav(false)
                }}
                onDeleteChat={handleDeleteChat}
                disableDeleteId={isBusy ? activeConversationId : null}
                onCollapse={() => setMobileNav(false)}
                onOpenSearch={() => setSearchOpen(true)}
                onOpenGovernanceLogs={() => setGovernanceLogsOpen(true)}
                chainValid={health?.chain_valid ?? null}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <TopBar
          title={activeTitle}
          connection={connection}
          contextOpen={contextOpen}
          sidebarCollapsed={!desktopSidebar}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          onToggleContext={() => setContextOpen((v) => !v)}
          onOpenSidebar={() => {
            setDesktopSidebar(true)
            setMobileNav(true)
          }}
          onRenameConversation={activeConversationId ? handleRenameConversation : undefined}
        />

        <div className="relative flex min-h-0 flex-1">
          {/* Conversation */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div ref={scrollRef} onScroll={onScroll} className="relative flex-1 overflow-y-auto">
              {status === 'loading' && projects.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <span className="relative flex size-2 items-center justify-center">
                      <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-60" />
                      <span className="relative size-2 rounded-full bg-primary" />
                    </span>
                    Loading workspace{'\u2026'}
                  </div>
                </div>
              ) : status === 'error' && messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
                  <div className="flex size-12 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10">
                    <TriangleAlert className="size-5 text-destructive" />
                  </div>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    {error || 'Could not load your workspace from the backend.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/70"
                  >
                    <RotateCcw className="size-3" />
                    Retry
                  </button>
                </div>
              ) : messages.length === 0 ? (
                <Welcome
                  onSend={handleSend}
                  projects={projects}
                  messages={messages}
                  status={status}
                />
              ) : (
                <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6">
                  {messages.map((m) => {
                    const timeline = m.role === 'assistant' ? timelines[m.id] : undefined
                    const isActive = m.id === lastAssistantId && isBusy
                    return (
                      <ChatMessage
                        key={m.id}
                        message={m}
                        timeline={timeline}
                        isActive={isActive}
                        isStreaming={isActive}
                        interrupted={m.id === interruptedId && !isBusy}
                        canEdit={m.role === 'user' && !isBusy}
                        onRetry={handleRetry}
                        onOpenContext={() => openContextFor(m.id)}
                        onOpenArtifact={openArtifact}
                        onRegenerate={m.id === lastAssistantId && !isBusy ? () => regenerate() : undefined}
                        onEditAndResend={(newText) => editAndResend(m.id, newText)}
                      />
                    )
                  })}

                  {error && (
                    <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm">
                      <TriangleAlert className="size-4 shrink-0 text-destructive" />
                      <span className="text-muted-foreground">{error}</span>
                      <button
                        type="button"
                        onClick={() => regenerate()}
                        className="ml-auto flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary/70"
                      >
                        <RotateCcw className="size-3" />
                        Resend
                      </button>
                    </div>
                  )}

                  <div ref={bottomRef} className="h-px" />
                </div>
              )}

              <AnimatePresence>
                {showJump && (
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    onClick={() => scrollToBottom()}
                    className="sticky bottom-4 left-1/2 z-10 mx-auto flex w-fit items-center gap-1.5 rounded-full border border-border glass-strong px-3 py-1.5 text-xs font-medium text-foreground shadow-lg"
                  >
                    <ArrowDown className="size-3.5" />
                    Jump to latest
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Composer */}
            <div className="shrink-0 px-4 pb-4 pt-2 sm:px-6">
              <div className="mx-auto w-full max-w-3xl space-y-2">
                <AnimatePresence>
                  {connection !== 'online' && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="rounded-lg border border-[oklch(0.78_0.13_82)]/30 bg-[oklch(0.78_0.13_82)]/10 px-3 py-1.5 text-xs text-[oklch(0.78_0.13_82)]"
                    >
                      {connection === 'offline' ? (
                        <>
                          {"You're offline"}
                          {queued.length > 0
                            ? ` \u2014 ${queued.length} message${queued.length > 1 ? 's' : ''} queued, will send on reconnect`
                            : ' \u2014 new messages will be queued'}
                        </>
                      ) : (
                        'Backend unreachable \u2014 retrying\u2026'
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {queued.length > 0 && (
                  <div className="space-y-1.5">
                    <AnimatePresence initial={false}>
                      {queued.map((q, i) => (
                        <motion.div
                          key={`${q}-${i}`}
                          layout
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 8 }}
                          className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground"
                        >
                          <RotateCcw className="size-3 shrink-0 animate-spin-slow opacity-70" />
                          <span className="truncate">{q}</span>
                          <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide opacity-70">
                            Queued
                          </span>
                          <button
                            type="button"
                            onClick={() => removeQueued(i)}
                            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                            aria-label="Remove queued message"
                          >
                            <X className="size-3.5" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                <Composer
                  onSend={handleSend}
                  onStop={handleStop}
                />
              </div>
            </div>
          </div>

          {/* Desktop context panel */}
          <AnimatePresence initial={false}>
            {contextOpen && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 380, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="hidden shrink-0 overflow-hidden border-l border-border glass lg:block"
              >
                <div className="h-full w-[380px]">
                  <ContextPanel timeline={openContextTimeline} onClose={() => setContextOpen(false)} />
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Desktop artifact panel */}
          <AnimatePresence initial={false}>
            {artifactOpen && selectedArtifact && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 420, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="hidden shrink-0 overflow-hidden border-l border-border glass lg:block"
              >
                <div className="h-full w-[420px]">
                  <ArtifactPanel artifact={selectedArtifact} onClose={() => setArtifactOpen(false)} />
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile context overlay */}
      <AnimatePresence>
        {contextOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setContextOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="fixed inset-y-0 right-0 z-50 w-[88vw] max-w-sm border-l border-border glass-strong lg:hidden"
            >
              <ContextPanel timeline={openContextTimeline} onClose={() => setContextOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Mobile artifact overlay */}
      <AnimatePresence>
        {artifactOpen && selectedArtifact && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setArtifactOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="fixed inset-y-0 right-0 z-50 w-[92vw] max-w-md border-l border-border glass-strong lg:hidden"
            >
              <ArtifactPanel artifact={selectedArtifact} onClose={() => setArtifactOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
