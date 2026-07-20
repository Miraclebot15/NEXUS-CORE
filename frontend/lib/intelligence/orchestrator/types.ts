import type {
  IntentAnalysis,
} from "../router"


export type IntelligenceIntent =
  | "chat"
  | "search"
  | "coding"
  | "research"
  | "tool_execution"



export interface IntelligenceRequest{

  input:string

  intent?:IntentAnalysis

}



export interface ExecutionTask{

  name:string

  capability?:string

  order:number

}



export interface ExecutionPlan{

  intent:IntelligenceIntent

  requiresMemory:boolean

  requiresTools:boolean

  modelPreference?:string

  tasks?:ExecutionTask[]

  createdAt:number

}
