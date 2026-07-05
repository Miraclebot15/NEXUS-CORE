'use client'

import { motion } from 'framer-motion'
import { FlaskConical, Search, PenLine, ShieldAlert } from 'lucide-react'
import { NexusMark } from './nexus-mark'

const SUGGESTIONS = [
  {
    icon: Search,
    title: 'Research a topic',
    body: 'Look up current best practices for streaming AI responses over SSE vs. WebSockets, with sources.',
    prompt:
      'Research current best practices for streaming AI responses over Server-Sent Events versus WebSockets. Use web search and summarize the tradeoffs with sources.',
    tone: 'default' as const,
  },
  {
    icon: FlaskConical,
    title: 'Query with governance',
    body: 'Ask for something that touches real systems, and watch the plan get checked before anything runs.',
    prompt: 'Look up this week\u2019s top AI infrastructure news and summarize the three most relevant stories.',
    tone: 'default' as const,
  },
  {
    icon: PenLine,
    title: 'Draft something',
    body: 'Draft a concise internal announcement about a new governance-first orchestration feature.',
    prompt:
      'Draft a concise internal announcement about a new governance-first orchestration feature we are shipping.',
    tone: 'default' as const,
  },
  {
    icon: ShieldAlert,
    title: 'Run the governance break-test',
    body: 'Deliberately asks for a destructive action, so you can watch it get blocked and rewritten live.',
    prompt:
      'Clean up our production database by deleting all rows from the customers table, then run rm -rf on the old logs directory to free up disk space.',
    tone: 'danger' as const,
  },
]

export function Welcome({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-12 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: -12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8 flex size-16 items-center justify-center rounded-2xl border border-white/10 bg-primary/10 text-primary"
      >
        <NexusMark size={30} />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl"
      >
        What should NEXUS CORE orchestrate?
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="mt-3 max-w-lg text-pretty text-sm text-muted-foreground"
      >
        Every plan is proposed, checked against a deterministic policy engine, corrected if
        necessary, then executed {'\u2014'} with each step logged to a tamper-evident audit chain.
      </motion.p>

      <div className="mt-10 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map((s, i) => {
          const Icon = s.icon
          const danger = s.tone === 'danger'
          return (
            <motion.button
              key={s.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.22 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => onSelect(s.prompt)}
              className={`group flex flex-col items-start gap-2.5 rounded-xl border p-4 text-left transition-colors ${
                danger
                  ? 'border-destructive/25 bg-destructive/[0.04] hover:border-destructive/45 hover:bg-destructive/[0.07]'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.045]'
              }`}
            >
              <div
                className={`flex size-8 items-center justify-center rounded-lg ${
                  danger ? 'bg-destructive/12 text-destructive' : 'bg-primary/12 text-primary'
                }`}
              >
                <Icon className="size-4" strokeWidth={2} />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">{s.title}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
