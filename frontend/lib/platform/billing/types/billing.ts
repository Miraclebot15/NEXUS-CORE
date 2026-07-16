export type BillingInterval =
  | "monthly"
  | "yearly"


export type BillingPlanId =
  | "basic"
  | "pro"
  | "creator"
  | "team"
  | "business"
  | "enterprise"


export interface BillingPlan {

  id: BillingPlanId

  name: string

  monthlyPrice: number

  yearlyPrice: number

  description: string

}


export interface Subscription {

  userId: string

  plan: BillingPlanId

  interval: BillingInterval

  active: boolean

  startedAt: number

  expiresAt: number

}


export interface BillingDecision {

  allowed: boolean

  reason: string

  upgradePlan?: BillingPlanId

}
