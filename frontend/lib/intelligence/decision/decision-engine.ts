import type {
  IntelligenceDecision,
} from "./types"


import type {
  IntentAnalysis,
} from "../router/types"


import type {
  FreshnessAnalysis,
} from "../freshness/types"



export class DecisionEngine {


  decide(
    intent: IntentAnalysis,
    freshness: FreshnessAnalysis
  ): IntelligenceDecision {


    if(
      freshness.requiresRetrieval
    ){

      return {

        action:"retrieve",

        intent,

        freshness,

        reason:
          "Fresh information required"

      }

    }


    if(
      intent.requiresTools
    ){

      return {

        action:"use_tool",

        intent,

        freshness,

        reason:
          "Capability required"

      }

    }


    return {

      action:"answer",

      intent,

      freshness,

      reason:
        "Direct response is sufficient"

    }

  }

}
