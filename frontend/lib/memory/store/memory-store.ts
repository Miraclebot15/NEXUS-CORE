import type { MemoryEntry } from "../types"

import type {
  MemoryQuery,
  MemorySearchResult,
} from "./types"

export interface MemoryStore {

  save(
    memory: MemoryEntry
  ): Promise<void>

  update(
    memory: MemoryEntry
  ): Promise<void>

  delete(
    id: string
  ): Promise<void>

  get(
    id: string
  ): Promise<MemoryEntry | undefined>

  search(
    query: MemoryQuery
  ): Promise<MemorySearchResult[]>

}
