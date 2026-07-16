import type {
  MemoryImportance,
  MemoryScope,
} from "../types"

export type MemoryDecision =
  | "allow"
  | "deny"
  | "confirm"
  | "summarize"
  | "merge"
  | "defer"

export interface MemoryPolicyResult {

  decision: MemoryDecision

  reason: string

  confidence: number

  suggestedImportance?: MemoryImportance

  suggestedScope?: MemoryScope

}
