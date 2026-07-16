import {
  GoogleCapability,
} from "../base/google-capability"

import type {
  PermissionScope,
} from "@/lib/security/permissions/types"

import type {
  GoogleClient,
} from "@/lib/integrations/google/google-client"



export class GmailCapability
  extends GoogleCapability {


  readonly id =
    "google.gmail"


  readonly name =
    "Gmail Assistant"



  readonly permissions:
    readonly PermissionScope[] = [

      "gmail.read",
      "gmail.send",
      "gmail.modify"

    ]



  constructor(
    client:GoogleClient
  ){

    super(client)

  }



  async execute(
    input:unknown,
    context:any
  ){


    const action =
      (input as any)?.action



    switch(action){


      case "profile":

        return this.request(

          "https://gmail.googleapis.com/gmail/v1/users/me/profile",

          "gmail",

          context

        )



      default:

        return {

          status:
            "ready",

          capability:
            "gmail",

          message:
            "Gmail capability initialized"

        }

    }


  }


}
