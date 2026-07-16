import type { MemoryEntry } from "../types"

export function filterExpired(
  memories: MemoryEntry[]
){

  const now = Date.now()

  return memories.filter(memory => {

    if(!memory.expiresAt){
      return true
    }

    return (
      new Date(memory.expiresAt).getTime()
      > now
    )

  })

}

export function removeDeleted(
  memories: MemoryEntry[]
){

  return memories.filter(
    memory => !memory.deleted
  )

}
