import {
  buildBillingPlatform,
} from "./billing-bootstrap"

import {
  buildEntitlements,
} from "./entitlement-bootstrap"

import {
  buildProviderRegistry,
} from "./provider-bootstrap"

import {
  buildTrialManager,
} from "./trial-bootstrap"

import {
  PlatformGuard,
} from "../guard"

import {
  buildAIRuntime,
} from "../ai/bootstrap"

import {
  PermissionManager,
} from "@/lib/security/permissions/permission-manager"

import {
  ConsentStore,
} from "@/lib/security/permissions/consent-store"


export interface NexusPlatform{

  billing:
    ReturnType<
      typeof buildBillingPlatform
    >

  entitlements:
    ReturnType<
      typeof buildEntitlements
    >

  providers:
    ReturnType<
      typeof buildProviderRegistry
    >

  permissions:
    PermissionManager

  consentStore:
    ConsentStore

  trial:
    ReturnType<
      typeof buildTrialManager
    >

  guard:
    PlatformGuard

  ai:
    ReturnType<
      typeof buildAIRuntime
    >

}


export function buildPlatform(){

  const billing =
    buildBillingPlatform()


  const entitlements =
    buildEntitlements(
      billing.subscriptions
    )


  const providers =
    buildProviderRegistry()


  const consentStore =
    new ConsentStore()


  const permissions =
    new PermissionManager(
      consentStore
    )


  const trial =
    buildTrialManager()


  const guard =
    new PlatformGuard(

      permissions,

      entitlements,

      billing.billing,

      providers

    )


  const ai =
    buildAIRuntime()


  return{

    billing,

    entitlements,

    providers,

    permissions,

    consentStore,

    trial,

    guard,

    ai,

  }

}
