'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, PanelRightOpen, ShieldAlert, ShieldCheck } from 'lucide-react'
import { KIND_META, VERDICT_META, type Timeline } from '@/lib/orchestration'
import { cn } from '@/lib/utils'

/** A solid-color activity ring (SVG stroke-dasharray sweep), replacing the
 *  old conic-gradient spinner. */
function ActivityRing({ active }: { active: boolean }) {
  return (
    <span className="relative flex size-6 shrink-0 items-center justify-center">
      <svg viewBox="0 0 24 24" className="absolute inset-0 size-full -rotate-90">
        <circle
          cx="12"
          cy="12"
          r="9.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-white/10"
        />
        {active && (
          <circle
            cx="12"
            cy="12"
            r="9.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="20 40"
            className="sweep-stroke text-primary"
          />
        )}
      </svg>
      <span
        className={cn(
          'relative size-1.5 rounded-full transition-colors',
          active ? 'bg-primary' : 'bg-muted-foreground',
        )}
      />
    </span>
  )
}

function summarize(timeline: Timeline): string {
  switch (timeline.finalStatus) {
    case 'EXECUTED':
      return `Executed \u00b7 ${timeline.events.length} steps logged`
    case 'REJECTED':
      return 'Rejected by governance'
    case 'FAILED_PROPOSAL':
      return 'ELLA could not propose a valid plan'
    case 'FAILED_CORRECTION':
      return 'JANE could not produce a compliant correction'
    case 'EXECUTION_FAILED':
      return 'Execution failed'
    default:
      return 'Working\u2026'
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

  return (
    <div className="mb-3">
      <div className="inline-flex max-w-full items-center gap-1 rounded-full border border-border glass px-1 py-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 items-center gap-2.5 rounded-full py-1 pl-1.5 pr-3 transition-colors hover:bg-white/5"
        >
          <ActivityRing active={isActive} />

          <span className="flex min-w-0 flex-col items-start">
            <span className="flex items-center gap-1.5 text-sm font-medium leading-tight">
              {!isActive && wasBlocked && <ShieldAlert className="size-3.5 text-destructive" />}
              {!isActive && !wasBlocked && timeline.finalStatus === 'EXECUTED' && (
                <ShieldCheck className="size-3.5 text-[oklch(0.72_0.14_160)]" />
              )}
              <span className={isActive ? 'text-foreground' : 'text-muted-foreground'}>
                {isActive ? 'Orchestrating' : summarize(timeline)}
              </span>
            </span>
            <AnimatePresence mode="wait">
              {isActive && current && (
                <motion.span
                  key={current.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25 }}
                  className="max-w-[240px] truncate text-[11px] leading-tight text-muted-foreground"
                >
                  {current.label}
                </motion.span>
              )}
            </AnimatePresence>
          </span>

          <ChevronDown
            className={cn(
              'size-3.5 shrink-0 text-muted-foreground transition-transform',
              open && 'rotate-180',
            )}
          />
        </button>
        <button
          type="button"
          onClick={onOpenContext}
          title="Open orchestration in context panel"
          className="flex shrink-0 items-center rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <PanelRightOpen className="size-3.5" />
        </button>
      </div>

      {/* Indeterminate progress while streaming -- solid block, not a gradient sweep */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: '11rem' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="slide-indeterminate mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]"
          />
        )}
      </AnimatePresence>

      {/* The Chain Rail: each step is a hash-linked node, colored by its real verdict */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <ol className="mt-2 space-y-0 rounded-xl border border-border glass p-2">
              {events.map((ev, idx) => {
                const kindMeta = KIND_META[ev.kind]
                const verdictMeta = VERDICT_META[ev.verdict]
                const isLast = idx === events.length - 1
                return (
                  <motion.li key={ev.id} layout className="relative flex items-start gap-3 px-1 py-2">
                    <div className="flex flex-col items-center self-stretch">
                      <span
                        className={cn(
                          'z-10 flex size-2.5 shrink-0 rounded-full ring-2 ring-card',
                          verdictMeta.ringClass,
                        )}
                      />
                      {!isLast && <span className="mt-0.5 w-px flex-1 bg-white/10" />}
                    </div>
                    <div className="min-w-0 flex-1 pb-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{kindMeta.label}</span>
                        <span
                          className={cn(
                            'rounded-full border border-border/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                            verdictMeta.textClass,
                            verdictMeta.bgClass,
                          )}
                        >
                          {verdictMeta.label}
                        </span>
                        <span className="ml-auto font-mono text-[10px] text-muted-foreground/50">
                          #{ev.hash}
                        </span>
                      </div>
                      <p className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                        {ev.detail}
                      </p>
                      {ev.triggeredRules && ev.triggeredRules.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {ev.triggeredRules.map((rule) => (
                            <li
                              key={rule}
                              className="font-mono text-[10px] text-destructive/90"
                            >
                              {'\u26A0'} {rule}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </motion.li>
                )
              })}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
