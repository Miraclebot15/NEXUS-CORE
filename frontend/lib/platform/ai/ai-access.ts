import {
  PlatformService,
} from "../services"


import {
  Feature,
} from "../entitlements/types/entitlements"


import type {
  AIExecutionContext,
} from "./ai-context"


export class AIAccessController{


  constructor(
    private readonly platform:
      PlatformService
  ){}


  canUseAI(
    userId:string,
    feature:Feature,
    provider?:string
  ):AIExecutionContext{


    this.platform.guard.authorize(
      userId,
      undefined,
      feature,
      provider
    )


    return {

      requestId:
        crypto.randomUUID(),

      userId,

      feature,

      provider,

      timestamp:
        Date.now(),

      trial:
        this.platform.trial.canStartTrial(),

    }

  }

}
