import {
  IntentRouter,
} from "../router/intent-router"


import {
  FreshnessEngine,
} from "../freshness/freshness-engine"


import {
  DecisionEngine,
} from "../decision/decision-engine"



export class IntelligenceOrchestrator {


  private readonly intentRouter =
    new IntentRouter()


  private readonly freshnessEngine =
    new FreshnessEngine()


  private readonly decisionEngine =
    new DecisionEngine()



  analyze(
    input:string
  ){

    const intent =
      this.intentRouter.analyze(
        input
      )


    const freshness =
      this.freshnessEngine.analyze(
        input
      )


    return this.decisionEngine.decide(
      intent,
      freshness
    )

  }

}
