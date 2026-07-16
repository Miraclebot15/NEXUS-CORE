import type {
 SubscriptionTier,
 UsageResource
} from "./types"



export interface PlanLimit {

 resource:UsageResource

 limit:number

}



export interface BillingPlan {

 tier:SubscriptionTier

 limits:PlanLimit[]

}



export const BILLING_PLANS:
BillingPlan[] = [


 {
  tier:"free",

  limits:[

   {
    resource:"messages",
    limit:50
   },

   {
    resource:"image_generation",
    limit:5
   }

  ]

 },


 {
  tier:"pro",

  limits:[

   {
    resource:"messages",
    limit:1000
   },

   {
    resource:"image_generation",
    limit:100
   },

   {
    resource:"video_generation",
    limit:20
   }

  ]

 }

]
