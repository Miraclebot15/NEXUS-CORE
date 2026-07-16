import type { MemoryEntry } from "../types"

export interface MemoryQuery {

  userId?: string

  conversationId?: string

  projectId?: string

  scope?: string

  limit?: number

  tags?: string[]

}

export interface MemorySearchResult {

  memory: MemoryEntry

  score: number

}
