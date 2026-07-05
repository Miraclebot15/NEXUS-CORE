'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bookmark,
  Check,
  Copy,
  GitBranch,
  Pencil,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react'
import type { NexusMessage } from '@/lib/use-nexus-workspace'
import type { Timeline } from '@/lib/orchestration'
import { Markdown } from './markdown'
import { ThinkingPill } from './thinking-pill'
import { OrchestrationActions } from './orchestration-actions'
import { cn } from '@/lib/utils'

function getText(message: NexusMessage): string {
  return message.parts.map((p) => (p.type === 'text' ? p.text : '')).join('')
}

function ActionButton({
  label,
  onClick,
  active,
  disabled,
  children,
}: {
  label: string
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? `${label} (coming soon)` : label}
      aria-label={label}
      className={cn(
        'flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground',
        active && 'text-primary',
        disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted-foreground',
      )}
    >
      {children}
    </button>
  )
}

export function ChatMessage({
  message,
  timeline,
  isActive,
  isStreaming,
  interrupted,
  canEdit,
  onRetry,
  onOpenContext,
  onRegenerate,
  onEditAndResend,
}: {
  message: NexusMessage
  timeline?: Timeline
  isActive: boolean
  isStreaming: boolean
  interrupted?: boolean
  canEdit?: boolean
  onRetry?: () => void
  onOpenContext: () => void
  onRegenerate?: () => void
  onEditAndResend?: (newText: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const text = getText(message)
  const isUser = message.role === 'user'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* ignore */
    }
  }

  const startEdit = () => {
    setDraft(text)
    setEditing(true)
  }

  const submitEdit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== text) {
      onEditAndResend?.(trimmed)
    }
    setEditing(false)
  }

  if (isUser) {
    if (editing) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end"
        >
          <div className="w-full max-w-[85%] rounded-2xl rounded-tr-md border border-primary/40 bg-secondary/60 p-2">
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submitEdit()
                }
                if (e.key === 'Escape') setEditing(false)
              }}
              rows={Math.min(8, Math.max(2, draft.split('\n').length))}
              className="w-full resize-none bg-transparent px-2 py-1.5 text-[15px] leading-relaxed text-foreground outline-none"
            />
            <div className="flex justify-end gap-1.5 px-1 pb-0.5">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-white/5"
              >
                <X className="size-3" /> Cancel
              </button>
              <button
                type="button"
                onClick={submitEdit}
                className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-colors hover:brightness-110"
              >
                Save & Submit
              </button>
            </div>
          </div>
        </motion.div>
      )
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="group flex justify-end"
      >
        <div className="flex max-w-[85%] flex-col items-end gap-1">
          <div className="rounded-2xl rounded-tr-md border border-border bg-secondary/60 px-4 py-3 text-[15px] leading-relaxed text-foreground">
            {text}
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={startEdit}
              title="Edit and resend"
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
            >
              <Pencil className="size-3" /> Edit
            </button>
          )}
        </div>
      </motion.div>
    )
  }

  const showEmptyStream = isStreaming && text.length === 0
  const wasRejected =
    !isStreaming &&
    timeline &&
    ['REJECTED', 'FAILED_PROPOSAL', 'FAILED_CORRECTION', 'EXECUTION_FAILED'].includes(
      timeline.finalStatus,
    )
  const wasExecuted = !isStreaming && timeline?.finalStatus === 'EXECUTED'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex gap-3.5"
    >
      {/* Assistant presence avatar -- reflects the real outcome, not a fixed icon */}
      <div className="relative mt-0.5 shrink-0">
        <div
          className={cn(
            'flex size-8 items-center justify-center rounded-lg border border-border bg-card',
            isActive && 'glow-primary',
            wasRejected && 'border-destructive/40',
          )}
        >
          {wasRejected ? (
            <ShieldAlert className="size-4 text-destructive" />
          ) : (
            <ShieldCheck className="size-4 text-primary" />
          )}
        </div>
        {isActive && <span className="absolute inset-0 rounded-lg bg-primary/25 animate-pulse-ring" />}
      </div>

      <div className="min-w-0 flex-1">
        {timeline && <OrchestrationActions timeline={timeline} isActive={isActive} />}
        {timeline && <ThinkingPill timeline={timeline} isActive={isActive} onOpenContext={onOpenContext} />}

        {showEmptyStream ? (
          <div className="flex items-center gap-3 py-1.5">
            <span className="relative flex size-2 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-60" />
              <span className="relative size-2 rounded-full bg-primary" />
            </span>
            <span className="animate-pulse text-sm font-medium text-muted-foreground">
              Formulating response
            </span>
          </div>
        ) : (
          <div
            className={cn(
              wasRejected && 'rounded-xl border border-destructive/25 bg-destructive/[0.04] p-3',
              wasExecuted && 'rounded-xl border border-[oklch(0.72_0.14_160)]/20 bg-[oklch(0.72_0.14_160)]/[0.03] p-3',
            )}
          >
            <Markdown content={text} streaming={isStreaming} />
          </div>
        )}

        {interrupted && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-center gap-2 rounded-lg border border-[oklch(0.78_0.13_82)]/30 bg-[oklch(0.78_0.13_82)]/10 px-3 py-2 text-xs text-[oklch(0.78_0.13_82)]"
          >
            <span>Connection to the orchestration stream was lost.</span>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="ml-auto flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 font-medium text-foreground transition-colors hover:bg-secondary/70"
              >
                <RefreshCw className="size-3.5" />
                Retry
              </button>
            )}
          </motion.div>
        )}

        {!isStreaming && text.length > 0 && (
          <div className="mt-2 flex items-center gap-0.5">
            <ActionButton label={copied ? 'Copied' : 'Copy'} onClick={copy}>
              {copied ? <Check className="size-4 text-[oklch(0.72_0.14_160)]" /> : <Copy className="size-4" />}
            </ActionButton>
            {onRegenerate && (
              <ActionButton label="Regenerate" onClick={onRegenerate}>
                <RefreshCw className="size-4" />
              </ActionButton>
            )}
            <ActionButton label="Bookmark" active={bookmarked} onClick={() => setBookmarked((v) => !v)} disabled>
              <Bookmark className={cn('size-4', bookmarked && 'fill-primary')} />
            </ActionButton>
            <ActionButton label="Branch conversation" disabled>
              <GitBranch className="size-4" />
            </ActionButton>
          </div>
        )}
      </div>
    </motion.div>
  )
}
