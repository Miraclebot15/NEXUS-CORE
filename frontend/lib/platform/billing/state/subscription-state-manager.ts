import {
  SubscriptionStatus,
} from "./subscription-state"

import type {
  SubscriptionState,
} from "./subscription-state"

export class SubscriptionStateManager {

  private readonly states =
    new Map<string,SubscriptionState>()

  get(
    userId:string
  ){
    return this.states.get(userId)
  }

  save(
    state:SubscriptionState
  ){
    this.states.set(
      state.userId,
      state
    )
  }

  createFree(
    userId:string
  ){

    this.save({

      userId,

      status:
        SubscriptionStatus.FREE,

      plan:"free",

      startedAt:Date.now(),

      expiresAt:Number.MAX_SAFE_INTEGER,

    })

  }

  setTrial(

    userId:string,

    plan:string,

    trialEndsAt:number

  ){

    this.save({

      userId,

      status:
        SubscriptionStatus.TRIAL,

      plan,

      startedAt:Date.now(),

      expiresAt:trialEndsAt,

      trialEndsAt,

    })

  }

  activate(

    userId:string,

    plan:string,

    expiresAt:number,

    stripeCustomerId?:string,

    stripeSubscriptionId?:string

  ){

    this.save({

      userId,

      status:
        SubscriptionStatus.ACTIVE,

      plan,

      startedAt:Date.now(),

      expiresAt,

      renewsAt:expiresAt,

      stripeCustomerId,

      stripeSubscriptionId,

    })

  }

  markPastDue(
    userId:string
  ){

    const state=this.get(userId)

    if(!state){
      return
    }

    state.status=
      SubscriptionStatus.PAST_DUE

    this.save(state)

  }

  cancel(
    userId:string
  ){

    const state=this.get(userId)

    if(!state){
      return
    }

    state.status=
      SubscriptionStatus.CANCELLED

    this.save(state)

  }

  expire(
    userId:string
  ){

    const state=this.get(userId)

    if(!state){
      return
    }

    state.status=
      SubscriptionStatus.EXPIRED

    this.save(state)

  }

}
