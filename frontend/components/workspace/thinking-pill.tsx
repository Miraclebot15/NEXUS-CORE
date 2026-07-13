'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ShieldCheck, ShieldAlert, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Timeline } from '@/lib/orchestration'

const STAGE_LABELS: Record<string, string> = {
  INTAKE: 'Reading your request...',
  ELLA_PROPOSE: 'Planning next steps...',
  GOVERNANCE_CHECK: 'Checking policy...',
  EXECUTION: 'Working on it...',
  ARTIFACT_CREATED: 'Saving results...',
  SYNTHESIS: 'Writing response...',
  TERMINAL: 'Finishing up...',
}

const STAGE_SUBTITLES: Record<string, string> = {
  INTAKE: 'Task received and logged',
  ELLA_PROPOSE: 'Determining best approach',
  GOVERNANCE_CHECK: 'Verifying against policy rules',
  EXECUTION: 'Running actions in governed sandbox',
  ARTIFACT_CREATED: 'Artifact saved to audit chain',
  SYNTHESIS: 'Generating final answer',
  TERMINAL: 'All steps complete',
}

const STAGE_ICONS: Record<string, string> = {
  INTAKE: '📥',
  ELLA_PROPOSE: '🧠',
  GOVERNANCE_CHECK: '🛡️',
  EXECUTION: '⚙️',
  ARTIFACT_CREATED: '📎',
  SYNTHESIS: '✍️',
  TERMINAL: '✅',
}

function summarize(timeline: Timeline): string {
  switch (timeline.finalStatus) {
    case 'EXECUTED': return `Completed · ${timeline.events.length} steps`
    case 'REJECTED': return 'Rejected by governance'
    case 'FAILED_PROPOSAL': return 'Could not propose a plan'
    case 'FAILED_CORRECTION': return 'Could not correct the plan'
    case 'EXECUTION_FAILED': return 'Execution failed'
    default: return 'Working...'
  }
}

export function ThinkingPill({
  timeline,
  isActive,
  onOpenContext,
}: {
  timeline: Timeline
  isActive: boolean
  onOpenContext: () => void
}) {
  const [open, setOpen] = useState(false)
  const { events } = timeline
  if (events.length === 0) return null

  const wasBlocked = events.some((e) => e.verdict === 'blocked')
  const current = events[events.length - 1]
  const currentStage = current?.stage ?? ''
  const activeLabel = STAGE_LABELS[currentStage] ?? 'Thinking...'
  const isDone = !isActive && timeline.finalStatus === 'EXECUTED'

  return (
    <div className="mb-3 w-full">
      {/* Compact pill */}
      <div className="inline-flex items-center gap-0 rounded-full border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.05] transition-colors"
        >
          {/* Status indicator */}
          {isActive ? (
            <Loader2 className="size-3 text-violet-400 animate-spin shrink-0" />
          ) : wasBlocked ? (
            <ShieldAlert className="size-3 text-destructive shrink-0" />
          ) : (
            <ShieldCheck className="size-3 text-green-400 shrink-0" />
          )}

          {/* Label */}
          <span className="text-[12px] font-medium text-foreground/80">
            {isActive ? activeLabel : summarize(timeline)}
          </span>

          <ChevronDown className={cn(
            'size-3 text-muted-foreground transition-transform duration-200 shrink-0',
            open && 'rotate-180'
          )} />
        </button>

        {/* Context panel button */}
        <button
          type="button"
          onClick={onOpenContext}
          className="px-2 py-1.5 border-l border-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors"
          title="View full audit trail"
        >
          <span className="text-[10px] font-mono">⊞</span>
        </button>
      </div>

      {/* Indeterminate progress bar */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0 }}
            className="mt-1.5 h-0.5 w-36 overflow-hidden rounded-full bg-white/[0.06] origin-left"
          >
            <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 animate-[slide-indeterminate_1.4s_ease-in-out_infinite]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expandable steps */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm p-3 space-y-0">
              {events.map((ev, idx) => {
                const isLast = idx === events.length - 1
                const isCurrent = isActive && isLast
                const stageLabel = ev.stage in STAGE_LABELS
                  ? STAGE_LABELS[ev.stage]?.replace('...', '') ?? ev.stage
                  : ev.label ?? ev.stage
                const subtitle = STAGE_SUBTITLES[ev.stage] ?? ''
                const icon = STAGE_ICONS[ev.stage] ?? '·'

                return (
                  <div key={ev.id} className="flex items-start gap-3 py-1.5">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center shrink-0">
                      <div className={cn(
                        'size-5 rounded-full flex items-center justify-center text-[10px] border',
                        isCurrent
                          ? 'border-violet-500/50 bg-violet-500/10 text-violet-400'
                          : ev.verdict === 'blocked'
                          ? 'border-destructive/50 bg-destructive/10 text-destructive'
                          : 'border-white/[0.08] bg-white/[0.04] text-white/40'
                      )}>
                        {isCurrent ? (
                          <Loader2 className="size-2.5 animate-spin" />
                        ) : ev.verdict === 'blocked' ? '✕' : (
                          <Check className="size-2.5 text-green-400" />
                        )}
                      </div>
                      {!isLast && <div className="w-px h-3 bg-white/[0.06] mt-0.5" />}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 pb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-medium text-foreground/80">{stageLabel}</span>
                        {ev.stage === 'GOVERNANCE_CHECK' && (
                          <span className={cn(
                            'text-[10px] font-mono px-1.5 py-0.5 rounded-full border',
                            ev.verdict === 'blocked'
                              ? 'border-destructive/40 text-destructive bg-destructive/10'
                              : 'border-green-500/30 text-green-400 bg-green-500/10'
                          )}>
                            {ev.verdict === 'blocked' ? 'BLOCKED' : 'APPROVED'}
                          </span>
                        )}
                        <span className="ml-auto font-mono text-[9px] text-white/20">
                          #{ev.hash?.slice(0, 8) ?? '--------'}
                        </span>
                      </div>
                      {subtitle && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
