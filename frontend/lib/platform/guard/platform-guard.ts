import type {
  PermissionManager,
} from "@/lib/security/permissions/permission-manager"

import type {
  EntitlementEngine,
} from "@/lib/platform/entitlements/core/entitlement-engine"

import type {
  BillingEngine,
} from "@/lib/platform/billing/core/billing-engine"

import type {
  ProviderRegistry,
} from "@/lib/platform/providers/provider-registry"

import type {
  PermissionScope,
} from "@/lib/security/permissions/types"

import {
  Feature,
} from "@/lib/platform/entitlements/types/entitlements"



export class PlatformGuard{

  constructor(

    private readonly permissions:
      PermissionManager,

    private readonly entitlements:
      EntitlementEngine,

    private readonly billing:
      BillingEngine,

    private readonly providers:
      ProviderRegistry

  ){}



  authorize(

    userId:string,

    permission?:PermissionScope,

    feature?:Feature,

    provider?:string

  ){

    if(permission){

      this.permissions.requirePermission(
        userId,
        permission
      )

    }


    if(
      feature &&
      !this.entitlements.hasFeature(
        userId,
        feature
      )
    ){

      throw new Error(
        `Feature locked: ${feature}`
      )

    }


    const billingDecision =
      this.billing.canSendMessage(
        userId
      )

    if(
      !billingDecision.allowed
    ){

      throw new Error(
        billingDecision.reason
      )

    }


    if(
      provider &&
      !this.providers.configured(
        provider
      )
    ){

      throw new Error(
        `Provider unavailable: ${provider}`
      )

    }

  }

}
