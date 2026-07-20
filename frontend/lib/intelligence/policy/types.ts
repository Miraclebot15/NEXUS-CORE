export type PolicyDecision =
  | "allow"
  | "fallback"
  | "deny"


export interface AIPolicyRequest{

  capability:string

  requestedTier:
    "cheap" |
    "balanced" |
    "flagship"

  remainingTokens:number

  userPlan:string

}


export interface AIPolicyResult{

  decision:
    PolicyDecision

  allowedTier:
    "cheap" |
    "balanced" |
    "flagship"

  reason:string

}
