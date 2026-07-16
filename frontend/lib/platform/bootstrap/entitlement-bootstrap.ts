import {
  EntitlementEngine,
} from "../entitlements/core/entitlement-engine"

import {
  SubscriptionManager,
} from "../billing/subscriptions/subscription-manager"



export function buildEntitlements(

  subscriptions:
    SubscriptionManager

){

  return new EntitlementEngine(

    subscriptions

  )

}
