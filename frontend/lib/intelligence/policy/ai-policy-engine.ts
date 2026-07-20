import type {
  AIPolicyRequest,
  AIPolicyResult,
} from "./types"


export class AIPolicyEngine{


  evaluate(
    request:AIPolicyRequest
  ):AIPolicyResult{


    if(
      request.remainingTokens <= 0
    ){

      return {

        decision:"deny",

        allowedTier:"cheap",

        reason:
          "No remaining token budget"

      }

    }



    if(
      request.requestedTier === "flagship" &&
      request.userPlan === "free"
    ){

      return {

        decision:"fallback",

        allowedTier:"balanced",

        reason:
          "Flagship models require higher entitlement"

      }

    }



    return {

      decision:"allow",

      allowedTier:
        request.requestedTier,

      reason:
        "Policy approved"

    }

  }


}
