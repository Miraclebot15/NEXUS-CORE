import type { MemoryStore }
from "../store/memory-store"

import type { MemoryEntry }
from "../types"

import {
  rankMemories,
} from "./ranking"

import {
  filterExpired,
  removeDeleted,
} from "./filters"

export async function retrieveMemories(

  store: MemoryStore,

  userId?: string,

  limit = 20,

): Promise<MemoryEntry[]> {

  const results =
    await store.search({

      userId,

      limit,

    })

  const memories =
    results.map(
      result => result.memory
    )

  return rankMemories(

    filterExpired(

      removeDeleted(
        memories
      )

    )

  )

}
