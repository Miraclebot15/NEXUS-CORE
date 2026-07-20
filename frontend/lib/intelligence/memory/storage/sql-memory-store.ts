import type{
  MemoryRecord,
} from "../types"

export class SQLMemoryStore{

  async save(
    memory:MemoryRecord
  ){

    return memory

  }

  async getUserMemories(
    userId:string
  ){

    return [] as MemoryRecord[]

  }

}
