import type {
  PermissionScope,
} from "./types"

import {
  ConsentStore,
} from "./consent-store"



export class PermissionManager {


  constructor(
    private readonly store:
      ConsentStore
  ){}



  hasPermission(
    userId:string,
    permission:PermissionScope
  ){

    const consent =
      this.store.get(
        userId
      )


    if(!consent){
      return false
    }


    return consent.permissions.includes(
      permission
    )

  }



  requirePermission(
    userId:string,
    permission:PermissionScope
  ){

    if(
      !this.hasPermission(
        userId,
        permission
      )
    ){

      throw new Error(
        `Missing permission: ${permission}`
      )

    }

  }


}
