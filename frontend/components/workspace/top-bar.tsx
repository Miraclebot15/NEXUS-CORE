'use client'

import {
  ChevronDown,
  Cpu,
  Menu as MenuIcon,
  PanelRight,
  PanelRightClose,
  PanelLeft,
  Pencil,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { QWEN_MODELS, DEFAULT_MODEL_ID } from '@/lib/models'
import { Menu, type MenuSection } from './menu'

export type Connection = 'online' | 'offline' | 'reconnecting'

export function TopBar({
  title,
  connection,
  contextOpen,
  sidebarCollapsed,
  selectedModel,
  onSelectModel,
  onToggleContext,
  onOpenSidebar,
  onRenameConversation,
}: {
  title: string
  connection: Connection
  contextOpen: boolean
  sidebarCollapsed: boolean
  selectedModel: string
  onSelectModel: (model: string) => void
  onToggleContext: () => void
  onOpenSidebar: () => void
  onRenameConversation?: () => void
}) {
  const currentModel =
    QWEN_MODELS.find((m) => m.id === selectedModel) ||
    QWEN_MODELS.find((m) => m.id === DEFAULT_MODEL_ID) ||
    QWEN_MODELS[0]

  const modelSections: MenuSection[] = [
    {
      id: 'models',
      label: 'AI Models',
      items: QWEN_MODELS.map((m) => ({
        id: m.id,
        label: m.label,
        description: m.description,
        icon: Cpu,
        selected: m.id === selectedModel,
        onSelect: () => onSelectModel(m.id),
      })),
    },
  ]
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenSidebar}
          title="Open menu"
          className="flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground lg:hidden"
        >
          <MenuIcon className="size-[18px]" />
        </button>
        {sidebarCollapsed && (
          <button
            type="button"
            onClick={onOpenSidebar}
            title="Open sidebar"
            className="hidden items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground lg:flex"
          >
            <PanelLeft className="size-[18px]" />
          </button>
        )}
        <button
          type="button"
          onClick={onRenameConversation}
          disabled={!onRenameConversation}
          title={onRenameConversation ? 'Rename conversation' : undefined}
          className="group flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors hover:bg-white/5 disabled:cursor-default disabled:hover:bg-transparent"
        >
          <span className="truncate max-w-[40vw] sm:max-w-xs">{title}</span>
          {onRenameConversation && (
            <Pencil className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          )}
        </button>
      </div>

      <div className="flex items-center gap-2">
        {/* Model selector dropdown (see lib/models.ts for the current
            limitation: this is cosmetic until the backend accepts a
            per-request model override). */}
        <Menu
          align="end"
          ariaLabel="Select AI model"
          sections={modelSections}
          trigger={({ ref, onClick, open, ...aria }) => (
            <button
              ref={ref}
              type="button"
              onClick={onClick}
              {...aria}
              title="AI model"
              className="hidden items-center gap-1.5 rounded-full border border-border glass px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground sm:flex"
            >
              <span className="size-1.5 rounded-full bg-primary" />
              <span className="truncate max-w-xs">{currentModel.label}</span>
              <ChevronDown
                className={cn(
                  'size-3 shrink-0 opacity-60 transition-transform',
                  open && 'rotate-180',
                )}
              />
            </button>
          )}
        />

        {/* Connection status: reflects a real backend health check */}
        <ConnectionBadge connection={connection} />

        <button
          type="button"
          onClick={onToggleContext}
          title={contextOpen ? 'Hide context' : 'Show context'}
          className={cn(
            'flex items-center justify-center rounded-lg p-2 transition-colors',
            contextOpen
              ? 'bg-white/[0.06] text-foreground'
              : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
          )}
        >
          {contextOpen ? (
            <PanelRightClose className="size-[18px]" />
          ) : (
            <PanelRight className="size-[18px]" />
          )}
        </button>
      </div>
    </header>
  )
}

function ConnectionBadge({ connection }: { connection: Connection }) {
  if (connection === 'online') {
    return (
      <div
        title="Backend reachable"
        className="flex items-center gap-1.5 rounded-full px-2 py-1.5 text-xs text-muted-foreground"
      >
        <Wifi className="size-3.5 text-[oklch(0.72_0.14_160)]" />
        <span className="hidden md:inline">Connected</span>
      </div>
    )
  }
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs',
        connection === 'reconnecting'
          ? 'border-[oklch(0.78_0.13_82)]/30 text-[oklch(0.78_0.13_82)]'
          : 'border-destructive/30 text-destructive',
      )}
    >
      {connection === 'reconnecting' ? (
        <>
          <span className="size-2 animate-pulse rounded-full bg-current" />
          {'Reconnecting\u2026'}
        </>
      ) : (
        <>
          <WifiOff className="size-3.5" />
          Offline
        </>
      )}
    </div>
  )
}
