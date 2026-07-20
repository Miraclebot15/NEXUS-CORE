import type{
  MemoryRecord,
} from "./types"

export class MemoryStore{

  private readonly memories =
    new Map<
      string,
      MemoryRecord[]
    >()

  save(
    memory:MemoryRecord
  ){

    const existing =
      this.memories.get(
        memory.userId
      ) ?? []

    existing.push(
      memory
    )

    this.memories.set(
      memory.userId,
      existing
    )

  }

  getUserMemories(
    userId:string
  ){

    return (
      this.memories.get(
        userId
      ) ?? []
    )

  }

}
