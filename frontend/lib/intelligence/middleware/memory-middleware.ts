import {
  MemoryService,
} from "../memory"

import type{
  MemoryContext,
} from "../memory"

import type{
  RetrievedMemory,
} from "../memory"

export interface MemoryMiddlewareResult{

  memories:RetrievedMemory[]

}

export class MemoryMiddleware{

  constructor(

    private readonly memory:
      MemoryService

  ){}

  async before(

    context:MemoryContext

  ):Promise<MemoryMiddlewareResult>{

    const memories=

      await this.memory.retrieve(

        context.userId,

        context.input,

        12

      )

    return{

      memories

    }

  }

  async after(

    context:MemoryContext,

    assistantResponse:string

  ){

    await this.memory.remember({

      userId:
        context.userId,

      input:
        context.input,

      conversationId:
        context.conversationId

    })

    await this.memory.remember({

      userId:
        context.userId,

      input:
        assistantResponse,

      conversationId:
        context.conversationId

    })

  }

}
