export type MemoryScope =
  | "conversation"
  | "project"
  | "workspace"
  | "user"
  | "global"

export type MemoryType =
  | "fact"
  | "preference"
  | "goal"
  | "skill"
  | "project"
  | "conversation"
  | "relationship"
  | "task"
  | "artifact"
  | "system"


export type MemoryImportance =
  | "ephemeral"
  | "low"
  | "medium"
  | "high"
  | "critical"


export type MemorySource =
  | "user"
  | "assistant"
  | "tool"
  | "system"
  | "inference"


export interface MemoryEntry {

  id: string

  scope: MemoryScope

  type: MemoryType

  source: MemorySource

  importance: MemoryImportance

  content: string

  summary?: string

  confidence: number

  createdAt: string

  updatedAt: string

  lastAccessedAt?: string

  tags?: string[]

  metadata?: Record<string, unknown>

  embeddingId?: string

  parentId?: string

  expiresAt?: string

  version: number

  locked?: boolean

  deleted?: boolean

}

