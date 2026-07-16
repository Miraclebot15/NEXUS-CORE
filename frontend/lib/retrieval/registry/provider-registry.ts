import type {
  RetrievalProvider,
} from "../providers/types"


export class RetrievalProviderRegistry {


  private readonly providers:
    Map<string, RetrievalProvider> =
      new Map()



  register(
    provider: RetrievalProvider
  ): void {


    if(
      this.providers.has(
        provider.name
      )
    ){
      throw new Error(
        `Provider '${provider.name}' already registered`
      )
    }


    this.providers.set(
      provider.name,
      provider
    )

  }



  unregister(
    name:string
  ):void {

    this.providers.delete(
      name
    )

  }



  get(
    name:string
  ):RetrievalProvider | undefined {

    return this.providers.get(
      name
    )

  }



  getAll():
    RetrievalProvider[] {

    return [
      ...this.providers.values()
    ]

  }


}
