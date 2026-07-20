import type {
  CostRequest,
  CostResult,
} from "./types"



export class CostPolicyEngine{


  calculate(
    request:CostRequest
  ):CostResult{


    let cost = 1000



    const tierMultiplier =
      request.modelTier === "cheap"
      ? 1
      :
      request.modelTier === "balanced"
      ? 3
      : 8



    const complexityMultiplier =
      request.complexity === "low"
      ? 1
      :
      request.complexity === "medium"
      ? 3
      : 10



    const modalityMultiplier = {

      text:1,

      image:10,

      video:50,

      audio:5,

      vision:8,

      tool:3

    }[request.modality]



    cost =
      cost *
      tierMultiplier *
      complexityMultiplier *
      modalityMultiplier



    return {

      units:cost,

      reason:
        `${request.modelTier} ${request.modality} request`

    }

  }


}
