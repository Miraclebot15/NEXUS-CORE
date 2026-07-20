import type {
  PipelineContext,
} from "./pipeline-context"


import type {
  PipelineResult,
} from "./pipeline-result"


import {
  IntentRouter,
} from "../router"


import {
  IntelligenceOrchestrator,
} from "../orchestrator"


import {
  PromptBuilder,
} from "../prompt"

import {
  MemoryMiddleware,
} from "../middleware"

import {
  ExecutionCoordinator,
} from "../execution"

import {
  RuntimeEngine,
} from "../runtime"



export class AIPipeline{


  constructor(

    private readonly router:
      IntentRouter,


    private readonly intelligence:
      IntelligenceOrchestrator,

    private readonly promptBuilder:
      PromptBuilder,

    private readonly memory:
      MemoryMiddleware,

    private readonly coordinator:
      ExecutionCoordinator,

    private readonly runtime:
      RuntimeEngine

  ){}



  async run(
    context:PipelineContext
  ):Promise<PipelineResult>{


    try{

      const intent =
        this.router.analyze(
          context.input
        )

      const memory =
        await this.memory.before({

          userId:
            context.userId,

          input:
            context.input,

          conversationId:
            context.conversationId

        })

      const prompt =
        this.promptBuilder.build({

          userInput:
            context.input,

          memories:
            memory.memories,

          context:
            context.metadata,

          personality:
            "default"

        })

      const plan =
        this.intelligence.analyze({

          input:
            context.input,

          intent

        })

      const runtime =
        await this.runtime.execute(

          plan,

          {

            userId:
              context.userId,

            requestId:
              crypto.randomUUID(),

            conversationId:
              context.conversationId,

            input:
              prompt.messages[0].content,

            userPlan:
              "free",

            remainingTokens:
              Number.MAX_SAFE_INTEGER,

            metadata:{

              ...context.metadata,

              system:
                prompt.system

            },

            createdAt:
              Date.now()

          }

        )

      if(

        runtime.success &&

        runtime.output &&

        typeof runtime.output==="object" &&

        "output" in runtime.output

      ){

        await this.memory.after(

          {

            userId:
              context.userId,

            input:
              context.input,

            conversationId:
              context.conversationId

          },

          String(runtime.output.output)

        )

      }

      return{

        success:
          runtime.success,

        response:
          runtime.output,

        model:
          runtime.model,

        completedAt:
          Date.now()

      }

    }catch(error){


      return {

        success:false,

        error:
          error instanceof Error
          ? error.message
          : "Pipeline failed",

        completedAt:
          Date.now()

      }


    }


  }


}
