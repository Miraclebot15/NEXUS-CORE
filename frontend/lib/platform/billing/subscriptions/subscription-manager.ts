import type {
  Subscription,
} from "../types/billing"

import type {
  BillingPlanId,
  BillingInterval,
} from "../types/billing"



export class SubscriptionManager {

  private readonly subscriptions =
    new Map<string,Subscription>()


  get(
    userId:string
  ){

    return this.subscriptions.get(
      userId
    )

  }


  set(
    subscription:Subscription
  ){

    this.subscriptions.set(
      subscription.userId,
      subscription
    )

  }


  activate(

    userId:string,

    plan:BillingPlanId,

    interval:BillingInterval,

    expiresAt:number

  ){

    this.set({

      userId,

      plan,

      interval,

      active:true,

      startedAt:Date.now(),

      expiresAt,

    })

  }


  cancel(
    userId:string
  ){

    const subscription =
      this.get(userId)

    if(!subscription){
      return
    }

    subscription.active=false

    this.set(subscription)

  }


  isActive(
    userId:string
  ){

    const subscription=
      this.get(userId)

    if(!subscription){
      return false
    }

    return (
      subscription.active &&
      subscription.expiresAt >
      Date.now()
    )

  }

}
