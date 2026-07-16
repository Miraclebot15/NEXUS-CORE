import type {
  IntentAnalysis,
} from "../router/types"

import type {
  FreshnessAnalysis,
} from "../freshness/types"


export type DecisionAction =
  | "answer"
  | "retrieve"
  | "use_tool"
  | "clarify"


export interface IntelligenceDecision {

  action: DecisionAction

  intent: IntentAnalysis

  freshness: FreshnessAnalysis

  reason: string

}
