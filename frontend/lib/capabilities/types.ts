import type {
  PermissionScope,
} from "@/lib/security/permissions/types"



export type CapabilityCategory =
  | "system"
  | "google"
  | "developer"
  | "media"
  | "productivity"
  | "security"



export interface Capability {


  readonly id:string


  readonly name:string


  readonly category:
    CapabilityCategory


  readonly permissions:
    readonly PermissionScope[]



  initialize?():
    Promise<void>



  shutdown?():
    Promise<void>



  execute(
    input:unknown,
    context:any
  ):
    Promise<unknown>


}
