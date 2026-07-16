import type {
  AIExecutionContext,
} from "../ai-context"


import type {
  ModelRoute,
} from "../router"



export interface ExecutionContext{

  request:
    AIExecutionContext

  route:
    ModelRoute

  startedAt:number

}
