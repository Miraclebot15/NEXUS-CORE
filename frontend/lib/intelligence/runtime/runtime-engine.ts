import type {
  ExecutionPlan,
} from "../orchestrator"


import type {
  ExecutionContext,
} from "./execution-context"


import type {
  RuntimeExecutionResult,
} from "./execution-result"


import {
  ExecutionCoordinator,
} from "../execution"


import {
  ProviderRegistry,
} from "../providers"



export class RuntimeEngine{


  constructor(

    private readonly coordinator:
      ExecutionCoordinator,


    private readonly providers:
      ProviderRegistry

  ){}



  async execute(
    plan:ExecutionPlan,
    context:ExecutionContext
  ):Promise<RuntimeExecutionResult>{


    try{


      const execution =
        await this.coordinator.prepare(
          plan,
          context
        )



      const provider =
        this.providers.get(
          "qwen"
        )



      if(!provider){

        throw new Error(
          "Qwen provider unavailable"
        )

      }



      const result =
        await provider.execute({

          model:
            execution.model,

          input:
            context.input

        })



      return {

        success:true,

        output:
          result,

        model:
          result.model,


        completedAt:
          Date.now()

      }


    }catch(error){


      return {

        success:false,

        error:
          error instanceof Error
          ? error.message
          : "Runtime execution failed",


        completedAt:
          Date.now()

      }


    }


  }


}
