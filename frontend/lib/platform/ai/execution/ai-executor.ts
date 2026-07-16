import type {
  ExecutionContext
} from "./execution-context"

import type {
  ExecutionResult
} from "./execution-result"

import {
  QwenExecution
} from "./qwen-execution"


export interface AIExecutorRequest{

  context:
    ExecutionContext

  input:string

}


export class AIExecutor{


  constructor(
    private readonly execution:
      QwenExecution
  ){}


  async execute(
    request:AIExecutorRequest
  ):Promise<ExecutionResult>{


    try{


      const response =
        await this.execution.run(
          request.context,
          request.input
        )


      return {

        success:true,

        data:{

          provider:
            request.context.route.provider,

          model:
            request.context.route.model,

          response

        },

        completedAt:
          Date.now()

      }


    }catch(error){


      return {

        success:false,

        error:
          error instanceof Error
          ? error.message
          : "Execution failed",

        completedAt:
          Date.now()

      }

    }


  }


}
