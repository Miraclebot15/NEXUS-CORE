import {
  RetrievalEngine,
} from "./retrieval-engine"


import {
  RetrievalProviderRegistry,
} from "../registry/provider-registry"



export class RetrievalManager {


  private readonly engine:
    RetrievalEngine



  constructor(
    private readonly registry:
      RetrievalProviderRegistry
  ){

    this.engine =
      new RetrievalEngine(
        this.registry.getAll()
      )

  }



  async search(
    query:string
  ){

    return this.engine.retrieve(
      query
    )

  }


}
