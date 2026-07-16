import {
  QwenClient
} from "../providers/qwen"

import type {
  ExecutionContext
} from "./execution-context"


export class QwenExecution {

  constructor(
    private readonly client: QwenClient
  ){}


  async run(
    context:ExecutionContext,
    input:string
  ){

    return this.client.chat(
      input,
      context.route.model
    )

  }

}
