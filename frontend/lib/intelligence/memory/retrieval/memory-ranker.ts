import type{
  RetrievedMemory,
} from "../types"

export class MemoryRanker{

  rank(
    memories:RetrievedMemory[]
  ){

    return memories.sort(

      (a,b)=>

        b.score - a.score

    )

  }

}
