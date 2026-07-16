import type {
  RetrievalProvider,
  RetrievalSource,
} from "../providers/types"


import {
  SourceRanker,
} from "../ranking/source-ranker"


import {
  RetrievalVerifier,
} from "../verification/verifier"



export class RetrievalEngine {


  private readonly ranker =
    new SourceRanker()


  private readonly verifier =
    new RetrievalVerifier()



  constructor(
    private readonly providers:
      RetrievalProvider[]
  ){}



  async retrieve(
    query:string
  ):Promise<RetrievalSource[]> {


    const results =
      await Promise.all(
        this.providers.map(
          provider =>
            provider.search(query)
        )
      )


    const flattened =
      results.flat()


    const ranked =
      this.ranker.rank(
        flattened
      )


    return ranked.filter(
      source =>
        this.verifier.verify(
          source
        ).verified
    )


  }


}
