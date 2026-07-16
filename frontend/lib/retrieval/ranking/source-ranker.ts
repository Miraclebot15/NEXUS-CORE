import type {
  RetrievalSource,
} from "../providers/types"


export class SourceRanker {


  rank(
    sources: RetrievalSource[]
  ): RetrievalSource[] {


    return [...sources].sort(
      (a,b) =>
        b.confidence -
        a.confidence
    )


  }


}
