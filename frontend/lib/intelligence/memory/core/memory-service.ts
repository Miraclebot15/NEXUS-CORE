import {
  MemoryExtractor,
} from "../memory-extractor"

import {
  MemoryClassifier,
} from "../memory-classifier"

import {
  MemoryPolicy,
} from "../memory-policy"

import {
  MemoryScorer,
} from "../memory-scorer"

import {
  MemoryStore,
} from "../memory-store"

import {
  MemoryIndexer,
} from "../indexing/memory-indexer"

import {
  MemoryRetriever,
} from "../retrieval/memory-retriever"

import {
  MemoryCache,
} from "../cache/memory-cache"

import type {
  MemoryContext,
  MemoryCandidate,
  MemoryRecord,
  MemoryType,
} from "../types"

export interface MemoryStatistics{

  total:number

  averageImportance:number

  averageConfidence:number

  byType:Record<string,number>

}

export class MemoryService{

  constructor(

    private readonly extractor:
      MemoryExtractor,

    private readonly classifier:
      MemoryClassifier,

    private readonly policy:
      MemoryPolicy,

    private readonly scorer:
      MemoryScorer,

    private readonly store:
      MemoryStore,

    private readonly retriever:
      MemoryRetriever,

    private readonly cache:
      MemoryCache,

    private readonly indexer:
      MemoryIndexer

  ){}

  async remember(

    context:MemoryContext

  ){

    const candidates=

      this.extractor.extract(
        context.input
      )

    const stored:
      MemoryRecord[]=[]

    for(

      const candidate

      of candidates

    ){

      const classified=

        this.classifier.classify(
          candidate
        )

      if(

        !this.policy.shouldStore(
          classified
        )

      ){

        continue

      }

      const duplicate=

        this.findDuplicate(

          context.userId,

          classified

        )

      if(

        duplicate

      ){

        await this.mergeMemory(

          duplicate,

          classified

        )

        stored.push(
          duplicate
        )

        continue

      }
      const memory:MemoryRecord={

        id:
          crypto.randomUUID(),

        userId:
          context.userId,

        type:
          classified.type as MemoryType,

        content:
          classified.content,

        importance:
          this.scorer.score(
            classified
          ),

        confidence:
          classified.confidence,

        tags:
          this.generateTags(
            classified
          ),

        metadata:{},

        createdAt:
          Date.now(),

        updatedAt:
          Date.now()

      }

      this.store.save(
        memory
      )

      await this.indexer.index(
        memory
      )

      this.cache.invalidate?.(
        context.userId
      )

      stored.push(
        memory

      )

    }

    return stored

  }

  async retrieve(

    userId:string,

    query:string,

    limit=10

  ){

    const cacheKey=

      `${userId}:${query}:${limit}`

    const cached=

      this.cache.get?.(
        cacheKey
      )

    if(
      cached
    ){

      return cached

    }

    const memories=

      await this.retriever.retrieve(

        userId,

        query,

        limit

      )

    this.cache.set?.(

      cacheKey,

      memories

    )

    return memories

  }

  async retrieveRelevant(

    context:MemoryContext,

    limit=10

  ){

    return this.retrieve(

      context.userId,

      context.input,

      limit

    )

  }

  retrieveByType(

    userId:string,

    type:MemoryType

  ){

    return this.store

      .getUserMemories(
        userId
      )

      .filter(

        memory=>

          memory.type===type

      )

  }

  retrieveRecent(

    userId:string,

    limit=20

  ){

    return this.store

      .getUserMemories(
        userId
      )

      .sort(

        (a,b)=>

          b.updatedAt-

          a.updatedAt

      )

      .slice(

        0,

        limit

      )

  }
  search(

    userId:string,

    keyword:string

  ){

    const query=

      keyword.toLowerCase()

    return this.store

      .getUserMemories(
        userId
      )

      .filter(

        memory=>

          memory.content
            .toLowerCase()
            .includes(query)

      )

  }

  async searchSemantic(

    userId:string,

    query:string,

    limit=10

  ){

    return this.retrieve(

      userId,

      query,

      limit

    )

  }

  protected buildMemoryRecord(

    userId:string,

    candidate:MemoryCandidate

  ):MemoryRecord{

    return{

      id:
        crypto.randomUUID(),

      userId,

      type:
        candidate.type as MemoryType,

      content:
        candidate.content,

      importance:
        this.scorer.score(
          candidate
        ),

      confidence:
        candidate.confidence,

      tags:
        this.generateTags(
          candidate
        ),

      metadata:{},

      createdAt:
        Date.now(),

      updatedAt:
        Date.now()

    }

  }

  protected generateTags(

    candidate:MemoryCandidate

  ){

    const tags:string[]=[]

    if(
      candidate.type
    ){

      tags.push(
        candidate.type
      )

    }

    candidate.content

      .split(/\s+/)

      .filter(

        word=>

          word.length>=5

      )

      .slice(

        0,

        6

      )

      .forEach(

        word=>

          tags.push(

            word

              .toLowerCase()

          )

      )

    return [

      ...new Set(tags)

    ]

  }

  protected findDuplicate(

    userId:string,

    candidate:MemoryCandidate

  ){

    return this.store

      .getUserMemories(
        userId
      )

      .find(

        memory=>

          memory.type===candidate.type &&

          memory.content
            .toLowerCase()

            ===

          candidate.content
            .toLowerCase()

      )

  }

  protected async mergeMemory(

    existing:MemoryRecord,

    candidate:MemoryCandidate

  ){

    existing.confidence=

      Math.min(

        1,

        existing.confidence+

        (

          candidate.confidence*

          0.15

        )

      )

    existing.importance=

      Math.min(

        100,

        existing.importance+5

      )

    existing.updatedAt=

      Date.now()

    await this.indexer.index(

      existing

    )

    this.cache.invalidate?.(

      existing.userId

    )

    return existing

  }
  updateMemory(

    memoryId:string,

    updater:(
      memory:MemoryRecord
    )=>MemoryRecord

  ){

    for(

      const memories

      of this.store["memories"].values()

    ){

      const index=

        memories.findIndex(

          memory=>

            memory.id===memoryId

        )

      if(

        index===-1

      ){

        continue

      }

      const updated=

        updater(

          memories[index]

        )

      updated.updatedAt=

        Date.now()

      memories[index]=

        updated

      this.cache.invalidate?.(

        updated.userId

      )

      return updated

    }

    return undefined

  }

  forgetMemory(

    userId:string,

    memoryId:string

  ){

    const memories=

      this.store.getUserMemories(

        userId

      )

    const index=

      memories.findIndex(

        memory=>

          memory.id===memoryId

      )

    if(

      index===-1

    ){

      return false

    }

    memories.splice(

      index,

      1

    )

    this.cache.invalidate?.(

      userId

    )

    return true

  }

  archiveMemory(

    memoryId:string

  ){

    return this.updateMemory(

      memoryId,

      memory=>({

        ...memory,

        metadata:{

          ...memory.metadata,

          archived:true

        }

      })

    )

  }

  async reindexUser(

    userId:string

  ){

    const memories=

      this.store.getUserMemories(

        userId

      )

    for(

      const memory

      of memories

    ){

      await this.indexer.index(

        memory

      )

    }

  }

  cleanup(

    userId:string

  ){

    const now=

      Date.now()

    return this.store

      .getUserMemories(

        userId

      )

      .filter(

        memory=>

          (

            now-

            memory.updatedAt

          )

          <

          31536000000

      )

  }

  stats(

    userId:string

  ):MemoryStatistics{

    const memories=

      this.store.getUserMemories(

        userId

      )

    const byType:

      Record<string,number>={}

    let importance=0

    let confidence=0

    for(

      const memory

      of memories

    ){

      byType[

        memory.type

      ]=(

        byType[

          memory.type

        ]??0

      )+1

      importance+=

        memory.importance

      confidence+=

        memory.confidence

    }

    return{

      total:

        memories.length,

      averageImportance:

        memories.length

        ?

        importance/

        memories.length

        :

        0,

      averageConfidence:

        memories.length

        ?

        confidence/

        memories.length

        :

        0,

      byType

    }

  }

  protected emitMemoryEvent(

    event:string,

    memory?:MemoryRecord

  ){

    console.debug(

      "[Memory]",

      event,

      memory?.id

    )

  }

}
