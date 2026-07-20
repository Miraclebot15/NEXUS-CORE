import{
  SQLMemoryStore,
} from "../storage/sql-memory-store"

import{
  MemoryRanker,
} from "./memory-ranker"

import type{
  RetrievedMemory,
} from "../types"

export class MemoryRetriever{

  constructor(

    private readonly store:
      SQLMemoryStore,

    private readonly ranker:
      MemoryRanker

  ){}

  async retrieve(

    userId:string,

    query:string,

    limit=10

  ){

    const memories =
      await this.store.getUserMemories(
        userId
      )

    const ranked =
      this.ranker.rank(

        memories.map(

          memory=>({

            memory,

            score:
              memory.importance

          })

        )

      )

    return ranked.slice(
      0,
      limit
    )

  }

}
