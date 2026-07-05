'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useUser, UserButton } from '@clerk/nextjs'
import {
  ChevronDown,
  ChevronsLeft,
  FolderKanban,
  Layers,
  MessageSquarePlus,
  Plus,
  ScrollText,
  Search,
  ShieldCheck,
  ShieldOff,
  TerminalSquare,
  Trash2,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NexusMark } from './nexus-mark'
import { Menu, type MenuSection } from './menu'
import type { ProjectOut } from '@/lib/api-client'

export interface ChatSummary {
  id: string
  title: string
}

function ConversationRow({
  chat,
  active,
  onSelect,
  onDelete,
  disabled,
}: {
  chat: ChatSummary
  active: boolean
  onSelect: () => void
  onDelete: () => void
  disabled?: boolean
}) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div
      className={cn(
        'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        active ? 'bg-white/[0.06] text-foreground' : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground',
      )}
      onMouseLeave={() => setConfirming(false)}
    >
      {active && (
        <motion.span layoutId="active-chat" className="h-4 w-0.5 shrink-0 rounded-full bg-primary" />
      )}
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 truncate text-left">
        {chat.title}
      </button>

      {disabled ? (
        <span
          title="Can't delete while orchestrating"
          className="shrink-0 rounded-md p-1 text-muted-foreground/30"
        >
          <Trash2 className="size-3.5" />
        </span>
      ) : confirming ? (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
              setConfirming(false)
            }}
            className="rounded-md bg-destructive/20 px-1.5 py-0.5 text-[10px] font-medium text-destructive transition-colors hover:bg-destructive/30"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setConfirming(false)
            }}
            className="rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-white/5"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setConfirming(true)
          }}
          title="Delete conversation"
          className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-white/5 hover:text-destructive group-hover:opacity-100"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </div>
  )
}

/** Nav items with no backing endpoint yet are shown, disabled, with a "Soon"
 *  tag -- rather than left clickable and silently doing nothing. */
const COMING_SOON_ITEMS: { icon: React.ElementType; label: string }[] = [
  { icon: Layers, label: 'Artifacts overview' },
  { icon: TerminalSquare, label: 'Sandbox Sessions' },
  { icon: Users, label: 'Team Workspace' },
]

export function Sidebar({
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  chats,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  disableDeleteId,
  onCollapse,
  onOpenSearch,
  onOpenGovernanceLogs,
  chainValid,
}: {
  projects: ProjectOut[]
  activeProjectId: string | null
  onSelectProject: (id: string) => void
  onCreateProject: (name: string) => void
  chats: ChatSummary[]
  activeChatId: string | null
  onNewChat: () => void
  onSelectChat: (id: string) => void
  onDeleteChat: (id: string) => void
  disableDeleteId?: string | null
  onCollapse: () => void
  onOpenSearch: () => void
  onOpenGovernanceLogs: () => void
  chainValid: boolean | null
}) {
  const { user } = useUser()
  const activeProject = projects.find((p) => p.id === activeProjectId)

  const projectSections: MenuSection[] = [
    {
      id: 'projects',
      label: 'Projects',
      items: [
        ...projects.map((p) => ({
          id: p.id,
          label: p.name,
          selected: p.id === activeProjectId,
          icon: FolderKanban,
          onSelect: () => onSelectProject(p.id),
        })),
        {
          id: 'new-project',
          label: 'New project\u2026',
          icon: Plus,
          onSelect: () => {
            const name = window.prompt('Name this project')
            if (name && name.trim()) onCreateProject(name.trim())
          },
        },
      ],
    },
  ]

  return (
    <div className="flex h-full flex-col gap-1 p-3">
      {/* Brand + project switcher */}
      <div className="flex items-center justify-between px-1 pb-2">
        <div className="flex items-center gap-2.5 px-1 py-1">
          <div className="relative flex size-8 items-center justify-center rounded-lg border border-white/10 bg-primary/12 text-primary">
            <NexusMark size={17} />
            <span className="absolute inset-0 rounded-lg bg-primary/15 animate-breathe" />
          </div>
          <div className="text-left leading-tight">
            <div className="text-sm font-semibold tracking-tight">NEXUS CORE</div>
            <Menu
              trigger={({ ref, onClick, open, ...aria }) => (
                <button
                  ref={ref}
                  onClick={onClick}
                  {...aria}
                  className="flex items-center gap-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span className="max-w-[110px] truncate">
                    {activeProject?.name ?? 'Loading\u2026'}
                  </span>
                  <ChevronDown className={cn('size-3 transition-transform', open && 'rotate-180')} />
                </button>
              )}
              sections={projectSections}
              ariaLabel="Switch project"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onCollapse}
          title="Collapse sidebar"
          className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <ChevronsLeft className="size-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={onNewChat}
        className="mb-1 flex items-center gap-2.5 rounded-xl border border-border bg-white/[0.03] px-3 py-2.5 text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:bg-primary/10"
      >
        <MessageSquarePlus className="size-[18px] text-primary" />
        New Chat
        <Plus className="ml-auto size-4 text-muted-foreground" />
      </button>

      <button
        type="button"
        onClick={onOpenSearch}
        className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
      >
        <Search className="size-[18px]" />
        Search memory
        <kbd className="ml-auto rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {'\u2318K'}
        </kbd>
      </button>

      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {/* Conversations in the active project */}
        <div className="mb-3">
          <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
            Conversations
          </div>
          <div className="space-y-0.5">
            {chats.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground/70">No conversations yet.</p>
            )}
            {chats.map((chat) => (
              <ConversationRow
                key={chat.id}
                chat={chat}
                active={chat.id === activeChatId}
                onSelect={() => onSelectChat(chat.id)}
                onDelete={() => onDeleteChat(chat.id)}
                disabled={chat.id === disableDeleteId}
              />
            ))}
          </div>
        </div>

        <div className="mb-3">
          <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
            Operations
          </div>
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={onOpenGovernanceLogs}
              className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
            >
              <ScrollText className="size-[18px] shrink-0 transition-colors group-hover:text-primary" />
              <span className="truncate">Governance Logs</span>
            </button>
            {COMING_SOON_ITEMS.map((item) => (
              <div
                key={item.label}
                className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground/50"
              >
                <item.icon className="size-[18px] shrink-0" />
                <span className="truncate">{item.label}</span>
                <span className="ml-auto rounded border border-border px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground/60">
                  Soon
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer: real audit chain status + Clerk user */}
      <div className="mt-1 space-y-1 border-t border-border pt-2">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <UserButton
            appearance={{
              elements: { userButtonAvatarBox: 'size-8' },
            }}
          />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-medium">
              {user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Signed in'}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              {chainValid === null ? (
                <span className="text-muted-foreground/70">Chain status unknown</span>
              ) : chainValid ? (
                <>
                  <ShieldCheck className="size-3 text-[oklch(0.72_0.14_160)]" />
                  Audit chain verified
                </>
              ) : (
                <>
                  <ShieldOff className="size-3 text-destructive" />
                  Chain integrity failure
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
