import{
  EmbeddingService,
} from "./embedding-service"

import{
  VectorMemoryStore,
} from "../storage/vector-memory-store"

import type{
  MemoryRecord,
} from "../types"

export class MemoryIndexer{

  constructor(

    private readonly embeddings:
      EmbeddingService,

    private readonly vectors:
      VectorMemoryStore

  ){}

  async index(
    memory:MemoryRecord
  ){

    await this.embeddings.embed(
      memory.content
    )

    await this.vectors.index(
      memory
    )

  }

}
