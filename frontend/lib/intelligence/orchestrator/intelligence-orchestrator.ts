import {
  IntentRouter,
} from "../router"


import type {
  IntelligenceRequest,
  ExecutionPlan,
} from "./types"



export class IntelligenceOrchestrator{


  constructor(
    private readonly router:
      IntentRouter
  ){}



  analyze(
    request:IntelligenceRequest
  ):ExecutionPlan{


    const intent =
      this.router.analyze(
        request.input
      )



    return {

      intent:
        intent.category === "unknown"
          ? "chat"
          : intent.category as any,


      requiresMemory:true,


      requiresTools:
        intent.requiresTools,


      modelPreference:
        intent.preferredCapability,


      createdAt:
        Date.now()

    }


  }


}
