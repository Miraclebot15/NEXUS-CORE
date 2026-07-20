import{
  MemoryExtractor,
} from "../memory-extractor"

import{
  MemoryClassifier,
} from "../memory-classifier"

import{
  MemoryPolicy,
} from "../memory-policy"

import{
  MemoryScorer,
} from "../memory-scorer"

import{
  MemoryStore,
} from "../memory-store"

import{
  MemoryIndexer,
} from "../indexing/memory-indexer"

import type{
  MemoryContext,
  MemoryRecord,
} from "../types"

export class MemoryManager{

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

    private readonly indexer:
      MemoryIndexer

  ){}

  async process(
    context:MemoryContext
  ){

    const candidates =
      this.extractor.extract(
        context.input
      )

    for(
      const candidate
      of candidates
    ){

      const classified =
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

      const importance =
        this.scorer.score(
          classified
        )

      const memory:MemoryRecord={

        id:
          crypto.randomUUID(),

        userId:
          context.userId,

        type:
          classified.type!,

        content:
          classified.content,

        importance,

        confidence:
          classified.confidence,

        tags:[],

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

    }

  }

}
