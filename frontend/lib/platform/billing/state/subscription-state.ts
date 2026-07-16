export enum SubscriptionStatus{

  FREE="free",

  TRIAL="trial",

  ACTIVE="active",

  PAST_DUE="past_due",

  CANCELLED="cancelled",

  EXPIRED="expired",

}

export interface SubscriptionState{

  userId:string

  status:SubscriptionStatus

  plan:string

  startedAt:number

  expiresAt:number

  renewsAt?:number

  stripeCustomerId?:string

  stripeSubscriptionId?:string

  trialEndsAt?:number

}
