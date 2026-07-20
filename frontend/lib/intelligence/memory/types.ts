export type MemoryType =
  | "identity"
  | "preference"
  | "project"
  | "fact"
  | "conversation"
  | "skill"
  | "goal"

export interface MemoryRecord{

  id:string

  userId:string

  type:MemoryType

  content:string

  importance:number

  confidence:number

  tags:string[]

  metadata?:Record<string,unknown>

  createdAt:number

  updatedAt:number

}

export interface MemoryCandidate{

  content:string

  type?:MemoryType

  confidence:number

}

export interface MemoryContext{

  userId:string

  input:string

  conversationId?:string

}

export interface RetrievedMemory{

  memory:MemoryRecord

  score:number

}
