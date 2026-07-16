export type FreshnessLevel =
  | "static"
  | "recent"
  | "live"


export interface FreshnessAnalysis {

  level: FreshnessLevel

  requiresRetrieval: boolean

  reason: string

  maxAgeMinutes?: number

}
