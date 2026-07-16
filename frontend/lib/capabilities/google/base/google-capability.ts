import type {
  Capability,
} from "../../types"

import type {
  GoogleClient,
} from "@/lib/integrations/google/google-client"



export abstract class GoogleCapability
  implements Capability {


  abstract readonly id:string

  abstract readonly name:string


  readonly category =
    "google" as const



  constructor(
    protected readonly client:
      GoogleClient
  ){}



  abstract readonly permissions:
    readonly any[]



  async initialize(){

    // Google capabilities can
    // perform startup checks here

  }



  async shutdown(){

    // cleanup hook

  }



  protected async request(
    url:string,
    service:
      "youtube"
      | "drive"
      | "gmail"
      | "calendar"
      | "sheets"
      | "slides"
      | "maps",
    context:any
  ){

    return this.client.request(
      url,
      {
        service,
        userId:
          context?.userId,
        accessToken:
          context?.accessToken
      }
    )

  }


  abstract execute(
    input:unknown,
    context:any
  ):Promise<unknown>


}
