export interface Provider{

  readonly id:string

  isConfigured():boolean

}



export class ProviderRegistry{

  private readonly providers =
    new Map<string,Provider>()


  register(
    provider:Provider
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


  has(
    id:string
  ){

    return this.providers.has(id)

  }


  configured(
    id:string
  ){

    return (
      this.providers.get(id)
        ?.isConfigured()
      ?? false
    )

  }


  all(){

    return [
      ...this.providers.values()
    ]

  }

}
