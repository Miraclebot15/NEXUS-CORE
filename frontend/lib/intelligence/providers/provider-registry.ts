import type {
  AIProvider,
} from "./provider-interface"



export class ProviderRegistry{


  private providers =
    new Map<string, AIProvider>()



  register(
    provider:AIProvider
  ){

    this.providers.set(
      provider.id,
      provider
    )

  }



  get(
    id:string
  ){

    return this.providers.get(id)

  }



  list(){

    return [
      ...this.providers.values()
    ]

  }


}
