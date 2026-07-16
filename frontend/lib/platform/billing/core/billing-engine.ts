import {
  SubscriptionManager,
} from "../subscriptions/subscription-manager"

import {
  UsageTracker,
} from "../usage/usage-tracker"

import {
  getFeatureLimits,
} from "../limits/feature-limits"

import type {
  BillingDecision,
} from "../types/billing"



export class BillingEngine{

  constructor(

    private readonly subscriptions:
      SubscriptionManager,

    private readonly usage:
      UsageTracker

  ){}



  canSendMessage(
    userId:string
  ):BillingDecision{

    const subscription=
      this.subscriptions.get(userId)

    if(!subscription){

      return{

        allowed:false,

        reason:
          "No active subscription",

        upgradePlan:"basic",

      }

    }


    if(
      !this.subscriptions.isActive(userId)
    ){

      return{

        allowed:false,

        reason:
          "Subscription expired",

        upgradePlan:
          subscription.plan,

      }

    }


    const limits=
      getFeatureLimits(
        subscription.plan
      )

    const usage=
      this.usage.get(userId)


    if(
      usage.requests >=
      limits.maxDailyMessages
    ){

      return{

        allowed:false,

        reason:
          "Daily message limit reached",

        upgradePlan:"pro",

      }

    }


    return{

      allowed:true,

      reason:"Allowed",

    }

  }



  recordMessage(
    userId:string
  ){

    this.usage.increment(
      userId,
      "requests"
    )

  }

}
