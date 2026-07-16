import type {
  ContextBuilder,
} from "../types"

import type {
  ContextPacket,
} from "../../types"

import type {
  MemoryStore,
} from "../../../store/memory-store"

import {
  retrieveMemories,
} from "../../../retrieval/retriever"


export class MemoryContextBuilder
  implements ContextBuilder {


  readonly name =
    "memory-context"


  readonly capability =
    "memory"


  readonly priority =
    10


  readonly parallel =
    true


  constructor(
    private readonly store: MemoryStore
  ){}


  async build(
    packet: ContextPacket
  ): Promise<ContextPacket>{


    const memories =
      await retrieveMemories(

        this.store,

        packet.userId,

        20

      )


    return {

      ...packet,

      memories: [

        ...packet.memories,

        ...memories,

      ],

      metadata: {

        ...packet.metadata,

        memoryCount:
          memories.length,

      }

    }

  }

}
