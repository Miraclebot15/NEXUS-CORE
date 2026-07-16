import type {
  MemoryEntry,
  MemoryImportance,
  MemoryType,
} from "../types"


export interface MemoryCandidate {

  content: string

  type: MemoryType

  importance: MemoryImportance

  confidence: number

  tags?: string[]

}


export type LifecycleDecision =
  | "remember"
  | "ignore"
  | "confirm"
  | "merge"


export interface LifecycleResult {

  decision: LifecycleDecision

  candidate?: MemoryCandidate

  reason: string

}
