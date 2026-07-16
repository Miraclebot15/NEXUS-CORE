import {
  getPlatform,
} from "./get-platform"

import type {
  PermissionScope,
} from "@/lib/security/permissions/types"

import {
  Feature,
} from "./entitlements/types/entitlements"


export function authorize(
  userId:string,
  options?:{
    permission?:PermissionScope
    feature?:Feature
    provider?:string
  }
){

  const platform =
    getPlatform()


  return platform.guard.authorize(
    userId,
    options?.permission,
    options?.feature,
    options?.provider
  )

}
