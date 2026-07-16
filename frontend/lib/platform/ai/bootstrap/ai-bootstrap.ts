import {
  QwenClient,
} from "../providers/qwen"

import {
  QwenExecution,
} from "../execution"

import {
  AIExecutor,
} from "../execution"


export function buildAIRuntime(){

  const client =
    new QwenClient(
      process.env.QWEN_API_KEY!,
      process.env.QWEN_BASE_URL!
    )


  const execution =
    new QwenExecution(
      client
    )


  const executor =
    new AIExecutor(
      execution
    )


  return {
    client,
    execution,
    executor,
  }

}
