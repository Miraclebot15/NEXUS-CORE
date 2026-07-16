export type SubscriptionTier =
  | "free"
  | "pro"
  | "business"
  | "enterprise"



export type UsageResource =
  | "messages"
  | "image_generation"
  | "video_generation"
  | "web_research"
  | "voice_minutes"
  | "storage"



export interface UserSubscription {

  userId:string

  tier:SubscriptionTier

  active:boolean

  startedAt:number

  expiresAt?:number

}



export interface UsageRecord {

  userId:string

  resource:UsageResource

  amount:number

  timestamp:number

}
