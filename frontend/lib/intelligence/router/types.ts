export type IntentCategory =
  | "general"
  | "search"
  | "coding"
  | "document"
  | "image"
  | "video"
  | "audio"
  | "calendar"
  | "email"
  | "maps"
  | "research"
  | "automation"
  | "unknown"


export interface IntentAnalysis {

  category: IntentCategory

  confidence: number

  requiresFreshData: boolean

  requiresTools: boolean

  preferredCapability?: string

  reasoning?: string

}
