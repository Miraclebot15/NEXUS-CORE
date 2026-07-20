import type {
  ExecutionPlan,
} from "../orchestrator"


export interface PlannedTask{

  name:string

  capability?:string

  order:number

}


export interface IntelligenceExecutionPlan
extends ExecutionPlan{

  tasks:
    PlannedTask[]

}
