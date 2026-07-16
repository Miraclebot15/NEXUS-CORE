import type { MemoryEntry } from "../types"

import type {
  MemoryQuery,
  MemorySearchResult,
} from "./types"

import type {
  MemoryStore,
} from "./memory-store"

export class InMemoryStore
  implements MemoryStore {

  private readonly memories =
    new Map<string, MemoryEntry>()

  async save(
    memory: MemoryEntry
  ) {

    this.memories.set(
      memory.id,
      memory
    )

  }

  async update(
    memory: MemoryEntry
  ) {

    this.memories.set(
      memory.id,
      memory
    )

  }

  async delete(
    id: string
  ) {

    this.memories.delete(id)

  }

  async get(
    id: string
  ) {

    return this.memories.get(id)

  }

  async search(
    query: MemoryQuery
  ): Promise<MemorySearchResult[]> {

    const results: MemorySearchResult[] = []

    for (const memory of this.memories.values()) {

      if (
        query.scope &&
        memory.scope !== query.scope
      ) {
        continue
      }

      results.push({
        memory,
        score: memory.confidence,
      })

    }

    results.sort(
      (a, b) => b.score - a.score
    )

    return results.slice(
      0,
      query.limit ?? 20
    )

  }

}
