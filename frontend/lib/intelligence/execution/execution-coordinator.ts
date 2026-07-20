import type {
  ExecutionPlan,
} from "../orchestrator"


import type {
  ExecutionContext,
} from "../runtime"



export interface CoordinatorResult{

  model:string

  capability:string

  estimatedTokens:number

}



export class ExecutionCoordinator{


  async prepare(
    plan:ExecutionPlan,
    context:ExecutionContext
  ):Promise<CoordinatorResult>{


    const capability =
      plan.modelPreference ??
      "qwen-default"



    return {

      capability,

      model:
        capability,

      estimatedTokens:
        1000

    }

  }


}
