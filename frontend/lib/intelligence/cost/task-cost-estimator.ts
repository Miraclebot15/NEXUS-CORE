import type {
  TaskCostRequest,
  TaskCostEstimate,
} from "./types"



export class TaskCostEstimator{


  estimate(
    request:TaskCostRequest
  ):TaskCostEstimate{


    let tokens = 1000



    if(
      request.complexity === "medium"
    ){

      tokens = 5000

    }



    if(
      request.complexity === "high"
    ){

      tokens = 20000

    }



    if(
      request.hasFile
    ){

      tokens += 5000

    }



    if(
      request.requiresVision
    ){

      tokens += 10000

    }



    return {

      estimatedTokens:
        tokens,

      estimatedImages:
        0,

      estimatedUploads:
        request.hasFile
          ? 1
          : 0

    }


  }


}
