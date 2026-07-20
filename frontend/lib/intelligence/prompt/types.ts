import type{
  RetrievedMemory,
} from "../memory"

export interface PromptMessage{

  role:
    | "system"
    | "user"
    | "assistant"

  content:string

}

export interface PromptBuildContext{

  userInput:string

  personality?:string

  memories?:RetrievedMemory[]

  context?:Record<
    string,
    unknown
  >

}

export interface BuiltPrompt{

  system:string

  messages:PromptMessage[]

  estimatedTokens:number

}
