import {
  PlatformService,
} from "../../services"


import {
  AIAccessController,
} from "../ai-access"


import {
  Feature,
} from "../../entitlements/types/entitlements"


export interface AIRequest{

  userId:string

  feature:Feature

  provider?:string

  model?:string

  input:string

}


export class AIGateway{


  constructor(

    private readonly platform:
      PlatformService,

    private readonly access:
      AIAccessController

  ){}



  async execute(
    request:AIRequest
  ){

    const context =
      this.access.canUseAI(
        request.userId,
        request.feature,
        request.provider
      )


    return {

      accepted:true,

      context,

      request,

      status:"ready",

    }

  }


}
