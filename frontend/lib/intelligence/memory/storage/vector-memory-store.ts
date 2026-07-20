import type{
  MemoryRecord,
} from "../types"

export class VectorMemoryStore{

  async index(
    memory:MemoryRecord
  ){

    return true

  }

  async search(
    query:string
  ){

    return [] as MemoryRecord[]

  }

}
