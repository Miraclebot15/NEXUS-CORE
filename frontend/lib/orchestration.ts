/**
 * NEXUS CORE :: lib/orchestration.ts
 *
 * Real data model for a task's orchestration trace, built incrementally from
 * the backend's actual SSE stream (see lib/api-client.ts `streamTask`).
 *
 * This replaces a previous version of this file that fabricated a plausible-
 * looking timeline client-side with hardcoded steps ("Safety review... No
 * violations found") and never represented a real BLOCKED or corrected
 * state. Every field here is derived from a real `TaskStreamEvent`.
 */

import type { TaskStreamEvent } from './api-client'

export type OrchestrationKind =
  | 'intake'
  | 'reasoning' // ELLA_PROPOSE
  | 'governance' // GOVERNANCE_CHECK / GOVERNANCE_RECHECK
  | 'correction' // JANE_CORRECT
  | 'execution' // EXECUTION
  | 'artifact' // ARTIFACT_CREATED
  | 'terminal'

export type StepVerdict = 'running' | 'approved' | 'blocked' | 'corrected' | 'failed' | 'done'

export interface PlanStepView {
  step_id: number
  action: string
  target: string
  params: Record<string, unknown>
  rationale: string
}

export interface OrchestrationEvent {
  id: string
  stage: string
  kind: OrchestrationKind
  label: string
  detail: string
  verdict: StepVerdict
  hash: string
  triggeredRules?: string[]
  plan?: { plan_summary: string; steps: PlanStepView[] } | null
  raw: unknown
}

export interface SearchResultItem {
  title: string
  snippet: string
  url: string
}

export interface SearchResultsContent {
  query: string
  results: SearchResultItem[]
  error: string
}

export interface ArtifactItem {
  id?: string
  artifactType: string
  title: string
  content: SearchResultsContent | Record<string, unknown>
}

export type FinalStatus =
  | 'running'
  | 'EXECUTED'
  | 'EXECUTION_FAILED'
  | 'REJECTED'
  | 'FAILED_PROPOSAL'
  | 'FAILED_CORRECTION'

export interface Timeline {
  id: string
  taskId: string | null
  prompt: string
  events: OrchestrationEvent[]
  artifacts: ArtifactItem[]
  finalStatus: FinalStatus
  createdAt: number
}

export const KIND_META: Record<
  OrchestrationKind,
  { label: string; icon: 'intake' | 'brain' | 'shield' | 'wand' | 'play' | 'file' | 'flag' }
> = {
  intake: { label: 'Intake', icon: 'intake' },
  reasoning: { label: "ELLA \u00b7 Propose", icon: 'brain' },
  governance: { label: 'Governance', icon: 'shield' },
  correction: { label: "JANE \u00b7 Correct", icon: 'wand' },
  execution: { label: 'Execution', icon: 'play' },
  artifact: { label: 'Artifact', icon: 'file' },
  terminal: { label: 'Result', icon: 'flag' },
}

export const VERDICT_META: Record<
  StepVerdict,
  { label: string; textClass: string; bgClass: string; ringClass: string }
> = {
  running: {
    label: 'Running',
    textClass: 'text-primary',
    bgClass: 'bg-primary/12',
    ringClass: 'bg-primary',
  },
  approved: {
    label: 'Approved',
    textClass: 'text-[oklch(0.72_0.14_160)]',
    bgClass: 'bg-[oklch(0.72_0.14_160)]/12',
    ringClass: 'bg-[oklch(0.72_0.14_160)]',
  },
  blocked: {
    label: 'Blocked',
    textClass: 'text-destructive',
    bgClass: 'bg-destructive/12',
    ringClass: 'bg-destructive',
  },
  corrected: {
    label: 'Corrected',
    textClass: 'text-[oklch(0.78_0.13_82)]',
    bgClass: 'bg-[oklch(0.78_0.13_82)]/12',
    ringClass: 'bg-[oklch(0.78_0.13_82)]',
  },
  failed: {
    label: 'Failed',
    textClass: 'text-destructive',
    bgClass: 'bg-destructive/12',
    ringClass: 'bg-destructive',
  },
  done: {
    label: 'Done',
    textClass: 'text-muted-foreground',
    bgClass: 'bg-white/[0.04]',
    ringClass: 'bg-muted-foreground',
  },
}

let counter = 0
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${counter++}`

function shortHash(hash: string): string {
  return hash ? hash.slice(0, 8) : '--------'
}

export function createTimeline(prompt: string): Timeline {
  return {
    id: uid('t'),
    taskId: null,
    prompt,
    events: [],
    artifacts: [],
    finalStatus: 'running',
    createdAt: Date.now(),
  }
}

/** Parses an artifact's `content` field, which arrives as either a JSON
 *  string (from ARTIFACT_CREATED / the REST artifacts endpoint, where the
 *  backend has already serialized it for storage) or a plain object (when
 *  read directly off an EXECUTION event's `artifacts[]`, pre-persistence). */
export function parseArtifactContent(content: unknown): Record<string, unknown> {
  if (typeof content === 'string') {
    try {
      return JSON.parse(content)
    } catch {
      return { raw: content }
    }
  }
  if (content && typeof content === 'object') return content as Record<string, unknown>
  return {}
}

/**
 * Folds one real backend SSE event into the running Timeline. Pure function:
 * returns a new Timeline, never mutates the one passed in, so it's safe to
 * call from a React state updater.
 */
export function applyStreamEvent(timeline: Timeline, event: TaskStreamEvent): Timeline {
  const detail = (event.detail ?? {}) as Record<string, unknown>
  const hash = shortHash(event.record_hash)

  switch (event.stage) {
    case 'INTAKE': {
      const taskId = (detail.task_id as string) ?? timeline.taskId
      const next: OrchestrationEvent = {
        id: uid('e'),
        stage: event.stage,
        kind: 'intake',
        label: event.label,
        detail: 'Task received and logged to the audit chain.',
        verdict: 'done',
        hash,
        raw: detail,
      }
      return { ...timeline, taskId, events: [...timeline.events, next] }
    }

    case 'ELLA_PROPOSE': {
      const status = detail.status as string
      const plan = detail.plan as Timeline['events'][number]['plan']
      const verdict: StepVerdict = status === 'OK' ? 'done' : 'failed'
      const next: OrchestrationEvent = {
        id: uid('e'),
        stage: event.stage,
        kind: 'reasoning',
        label: event.label,
        detail:
          status === 'OK'
            ? (plan?.plan_summary as string) || 'Plan proposed.'
            : `ELLA could not produce a valid plan: ${detail.error || 'unknown error'}`,
        verdict,
        hash,
        plan: plan ?? null,
        raw: detail,
      }
      return {
        ...timeline,
        events: [...timeline.events, next],
        finalStatus: verdict === 'failed' ? 'FAILED_PROPOSAL' : timeline.finalStatus,
      }
    }

    case 'GOVERNANCE_CHECK':
    case 'GOVERNANCE_RECHECK': {
      const isBlocked = detail.verdict === 'BLOCKED'
      const triggeredRules = (detail.triggered_rules as string[]) ?? []
      const next: OrchestrationEvent = {
        id: uid('e'),
        stage: event.stage,
        kind: 'governance',
        label: event.label,
        detail: (detail.reason as string) || (isBlocked ? 'Blocked by policy.' : 'Approved.'),
        verdict: isBlocked ? 'blocked' : 'approved',
        hash,
        triggeredRules,
        raw: detail,
      }
      return {
        ...timeline,
        events: [...timeline.events, next],
        // Provisional: REJECTED unless a later JANE_CORRECT/EXECUTION overrides it.
        finalStatus: isBlocked ? 'REJECTED' : timeline.finalStatus,
      }
    }

    case 'JANE_CORRECT': {
      const status = detail.status as string
      const plan = detail.plan as Timeline['events'][number]['plan']
      const verdict: StepVerdict = status === 'OK' ? 'corrected' : 'failed'
      const next: OrchestrationEvent = {
        id: uid('e'),
        stage: event.stage,
        kind: 'correction',
        label: event.label,
        detail:
          status === 'OK'
            ? (plan?.plan_summary as string) || 'Plan rewritten to comply with policy.'
            : `JANE could not produce a valid correction: ${detail.error || 'unknown error'}`,
        verdict,
        hash,
        plan: plan ?? null,
        raw: detail,
      }
      return {
        ...timeline,
        events: [...timeline.events, next],
        finalStatus: verdict === 'failed' ? 'FAILED_CORRECTION' : 'running',
      }
    }

    case 'EXECUTION': {
      const success = Boolean(detail.success)
      const logs = (detail.logs as string[]) ?? []
      const rawArtifacts = (detail.artifacts as Array<Record<string, unknown>>) ?? []
      const artifacts: ArtifactItem[] = rawArtifacts.map((a) => ({
        artifactType: (a.artifact_type as string) ?? 'text',
        title: (a.title as string) ?? 'Artifact',
        content: parseArtifactContent(a.content),
      }))
      const next: OrchestrationEvent = {
        id: uid('e'),
        stage: event.stage,
        kind: 'execution',
        label: event.label,
        detail: logs.length ? logs.join('\n') : 'Sandbox execution complete.',
        verdict: success ? 'done' : 'failed',
        hash,
        raw: detail,
      }
      return {
        ...timeline,
        events: [...timeline.events, next],
        artifacts: [...timeline.artifacts, ...artifacts],
        finalStatus: success ? 'EXECUTED' : 'EXECUTION_FAILED',
      }
    }

    case 'ARTIFACT_CREATED': {
      const artifact: ArtifactItem = {
        id: detail.id as string,
        artifactType: (detail.artifact_type as string) ?? 'text',
        title: (detail.title as string) ?? 'Artifact',
        content: parseArtifactContent(detail.content),
      }
      const next: OrchestrationEvent = {
        id: uid('e'),
        stage: event.stage,
        kind: 'artifact',
        label: event.label,
        detail: `Artifact saved: ${artifact.title}`,
        verdict: 'done',
        hash,
        raw: detail,
      }
      // Avoid double-adding: EXECUTION already appended a lightweight copy.
      const alreadyPresent = timeline.artifacts.some(
        (a) =>
          a.title === artifact.title &&
          JSON.stringify(a.content) === JSON.stringify(artifact.content),
      )
      return {
        ...timeline,
        events: [...timeline.events, next],
        artifacts: alreadyPresent ? timeline.artifacts : [...timeline.artifacts, artifact],
      }
    }

    case 'TERMINAL': {
      const next: OrchestrationEvent = {
        id: uid('e'),
        stage: event.stage,
        kind: 'terminal',
        label: event.label,
        detail: (detail.reason as string) || (detail.error as string) || 'Task finished.',
        verdict:
          timeline.finalStatus === 'EXECUTED' || timeline.finalStatus === 'running'
            ? 'done'
            : 'failed',
        hash,
        raw: detail,
      }
      return {
        ...timeline,
        events: [...timeline.events, next],
        finalStatus: timeline.finalStatus === 'running' ? 'EXECUTED' : timeline.finalStatus,
      }
    }

    default:
      return timeline
  }
}
