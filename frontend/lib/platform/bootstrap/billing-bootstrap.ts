import {
  SubscriptionManager,
} from "../billing/subscriptions/subscription-manager"

import {
  UsageTracker,
} from "../billing/usage/usage-tracker"

import {
  BillingEngine,
} from "../billing/core/billing-engine"



export interface BillingPlatform{

  subscriptions:
    SubscriptionManager

  usage:
    UsageTracker

  billing:
    BillingEngine

}



export function buildBillingPlatform():
BillingPlatform{

  const subscriptions =
    new SubscriptionManager()

  const usage =
    new UsageTracker()

  const billing =
    new BillingEngine(

      subscriptions,

      usage

    )

  return{

    subscriptions,

    usage,

    billing,

  }

}
