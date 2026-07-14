'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  BadgeCheck,
  Brain,
  ExternalLink,
  FileCode2,
  Play,
  ScrollText,
  ShieldCheck,
  Telescope,
  X,
} from 'lucide-react'
import type { SearchResultsContent, Timeline, ArtifactItem } from '@/lib/orchestration'
import { cn } from '@/lib/utils'

type Tab = 'reasoning' | 'research' | 'execution' | 'governance' | 'artifacts'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'reasoning', label: 'Reasoning', icon: Brain },
  { id: 'research', label: 'Research', icon: Telescope },
  { id: 'execution', label: 'Execution', icon: Play },
  { id: 'governance', label: 'Governance', icon: ShieldCheck },
  { id: 'artifacts', label: 'Artifacts', icon: FileCode2 },
]

function Empty({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-white/[0.02]">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <p className="max-w-[220px] text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

function isSearchResults(content: unknown): content is SearchResultsContent {
  return Boolean(content && typeof content === 'object' && 'results' in (content as object))
}

export function ContextPanel({
  timeline,
  onClose,
}: {
  timeline?: Timeline
  onClose: () => void
}) {
  const [tab, setTab] = useState<Tab>('reasoning')

  const reasoning = timeline?.events.filter((e) => e.kind === 'reasoning' || e.kind === 'correction') ?? []
  const execution = timeline?.events.filter((e) => e.kind === 'execution') ?? []
  const governance = timeline?.events.filter((e) => e.kind === 'governance') ?? []
  const searchArtifacts = (timeline?.artifacts ?? []).filter((a) => isSearchResults(a.content))
  const anyBlocked = governance.some((e) => e.verdict === 'blocked')

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <ScrollText className="size-4 text-primary" />
          <span className="text-sm font-semibold tracking-tight">Context</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Close panel"
          className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 overflow-x-auto border-b border-border px-2 py-2 hide-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'relative flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
              tab === t.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab === t.id && (
              <motion.span
                layoutId="ctx-tab"
                className="absolute inset-0 rounded-lg bg-white/[0.06]"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <t.icon className="relative size-3.5" />
            <span className="relative">{t.label}</span>
            {t.id === 'governance' && anyBlocked && (
              <span className="relative size-1.5 rounded-full bg-destructive" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!timeline ? (
          <Empty
            icon={Brain}
            text="Send a message to reveal reasoning traces, research, execution, and governance for that turn."
          />
        ) : (
          <>
            {tab === 'reasoning' &&
              (reasoning.length > 0 ? (
                <ol className="relative ml-1 space-y-5 border-l border-border pl-5">
                  {reasoning.map((e) => (
                    <li key={e.id} className="relative">
                      <span className="absolute -left-[25px] top-1 flex size-3 items-center justify-center rounded-full bg-primary/25">
                        <span className="size-1.5 rounded-full bg-primary" />
                      </span>
                      <div className="text-sm font-medium text-foreground">{e.label}</div>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{e.detail}</p>
                      {e.plan?.steps && e.plan.steps.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {e.plan.steps.map((s) => (
                            <div
                              key={s.step_id}
                              className="rounded-lg border border-border/60 bg-white/[0.02] p-2 text-xs"
                            >
                              <span className="font-mono font-medium text-foreground">{s.action}</span>
                              {s.target && <span className="text-muted-foreground"> {'\u2192'} {s.target}</span>}
                              {s.rationale && (
                                <p className="mt-0.5 text-muted-foreground">{s.rationale}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <Empty icon={Brain} text="No reasoning steps recorded for this turn yet." />
              ))}

            {tab === 'research' &&
              (searchArtifacts.length > 0 ? (
                <div className="space-y-4">
                  {searchArtifacts.map((a, ai) => {
                    const content = a.content as SearchResultsContent
                    return (
                      <div key={ai}>
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                          Query: <span className="text-foreground">{content.query}</span>
                        </p>
                        {content.error ? (
                          <p className="text-xs text-destructive">{content.error}</p>
                        ) : (
                          <div className="space-y-2">
                            {content.results.map((r, i) => (
                              <a
                                key={i}
                                href={r.url || undefined}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="block rounded-xl border border-border bg-white/[0.02] p-3 transition-colors hover:border-primary/40 hover:bg-white/[0.04]"
                              >
                                <div className="mb-1 flex items-center gap-2">
                                  <span className="truncate text-sm font-medium text-foreground">
                                    {r.title}
                                  </span>
                                  {r.url && <ExternalLink className="size-3 shrink-0 text-muted-foreground" />}
                                </div>
                                <p className="text-xs leading-relaxed text-muted-foreground">{r.snippet}</p>
                              </a>
                            ))}
                            {content.results.length === 0 && (
                              <p className="text-xs text-muted-foreground">No results returned.</p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <Empty
                  icon={Telescope}
                  text="No web research ran for this turn. Try Deep Research mode, or ask something that needs current information."
                />
              ))}

            {tab === 'execution' &&
              (execution.length > 0 ? (
                <div className="space-y-3">
                  {execution.map((e) => (
                    <div key={e.id} className="rounded-xl border border-border bg-white/[0.02] p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <span
                          className={cn(
                            'flex size-6 items-center justify-center rounded-lg',
                            e.verdict === 'failed' ? 'bg-destructive/15' : 'bg-[oklch(0.72_0.14_160)]/15',
                          )}
                        >
                          <Play
                            className={cn(
                              'size-3',
                              e.verdict === 'failed' ? 'text-destructive' : 'text-[oklch(0.72_0.14_160)]',
                            )}
                          />
                        </span>
                        <span className="text-sm font-medium text-foreground">{e.label}</span>
                        <span
                          className={cn(
                            'ml-auto flex items-center gap-1 text-[11px]',
                            e.verdict === 'failed' ? 'text-destructive' : 'text-[oklch(0.72_0.14_160)]',
                          )}
                        >
                          <BadgeCheck className="size-3" /> {e.verdict === 'failed' ? 'failed' : 'sandboxed'}
                        </span>
                      </div>
                      <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted-foreground">
                        {e.detail}
                      </pre>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty icon={Play} text="No execution steps ran for this turn." />
              ))}

            {tab === 'governance' &&
              (governance.length > 0 ? (
                <div className="space-y-3">
                  <div
                    className={cn(
                      'rounded-xl border p-3',
                      anyBlocked
                        ? 'border-destructive/30 bg-destructive/10'
                        : 'border-[oklch(0.72_0.14_160)]/30 bg-[oklch(0.72_0.14_160)]/10',
                    )}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      {anyBlocked ? (
                        <AlertTriangle className="size-4 text-destructive" />
                      ) : (
                        <ShieldCheck className="size-4 text-[oklch(0.72_0.14_160)]" />
                      )}
                      {anyBlocked ? 'Policy violation intercepted' : 'All actions within policy'}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {anyBlocked
                        ? 'At least one proposed plan was blocked by the deterministic governance engine before execution.'
                        : 'This turn completed safely. No restricted actions were intercepted.'}
                    </p>
                  </div>
                  {governance.map((e) => (
                    <div
                      key={e.id}
                      className={cn(
                        'flex items-start gap-3 rounded-xl border p-3',
                        e.verdict === 'blocked'
                          ? 'border-destructive/25 bg-destructive/[0.04]'
                          : 'border-border bg-white/[0.02]',
                      )}
                    >
                      {e.verdict === 'blocked' ? (
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                      ) : (
                        <BadgeCheck className="mt-0.5 size-4 shrink-0 text-[oklch(0.72_0.14_160)]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground">{e.label}</div>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{e.detail}</p>
                        {e.triggeredRules && e.triggeredRules.length > 0 && (
                          <ul className="mt-1.5 space-y-0.5">
                            {e.triggeredRules.map((rule) => (
                              <li key={rule} className="font-mono text-[10px] text-destructive/90">
                                {rule}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty icon={ShieldCheck} text="No governance checks recorded for this turn yet." />
              ))}

            {tab === 'artifacts' &&
              (timeline.artifacts.length > 0 ? (
                <div className="space-y-3">
                  {timeline.artifacts.map((a, i) => (
                    <div key={a.id ?? i} className="rounded-xl border border-border bg-white/[0.02] p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <FileCode2 className="size-3.5 text-primary" />
                        <span className="text-sm font-medium text-foreground">{a.title}</span>
                        <span className="ml-auto rounded-full border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {a.artifactType}
                        </span>
                      </div>
                      <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted-foreground">
                        {JSON.stringify(a.content, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty
                  icon={FileCode2}
                  text="Artifacts generated in a turn (search results, documents, code) will appear here."
                />
              ))}
          </>
        )}
      </div>
    </div>
  )
}
