import {
  CapabilityRegistry,
} from "./registry"

import type {
  Capability,
} from "./types"

import {
  PermissionManager,
} from "@/lib/security/permissions/permission-manager"



export class CapabilityManager {


constructor(
 private readonly registry:
 CapabilityRegistry,

 private readonly permissions?:
 PermissionManager
){}



async install(
 capability:Capability
){

 await capability.initialize?.()

 this.registry.register(
  capability
 )

}



async remove(
 id:string
){

 const capability =
 this.registry.get(id)


 await capability?.shutdown?.()


 this.registry.unregister(
  id
 )

}



async execute(
 id:string,
 input:unknown,
 context:any
){


 const capability =
 this.registry.get(id)



 if(!capability){

  throw new Error(
   `Capability ${id} not found`
  )

 }



 if(
  this.permissions &&
  capability.permissions.length > 0
 ){

  const userId =
    context?.userId


  if(!userId){

    throw new Error(
      "User authorization required"
    )

  }


  for(
    const permission
    of capability.permissions
  ){

    this.permissions.requirePermission(
      userId,
      permission
    )

  }

 }



 return capability.execute(
  input,
  context
 )


}


}
