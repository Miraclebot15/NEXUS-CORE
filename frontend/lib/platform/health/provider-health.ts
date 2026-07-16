export interface ProviderHealth{

  provider:string

  configured:boolean

  healthy:boolean

  message?:string

}

export class ProviderHealthRegistry{

  private readonly providers=
    new Map<
      string,
      ProviderHealth
    >()

  set(
    health:ProviderHealth
  ){

    this.providers.set(
      health.provider,
      health
    )

  }

  get(
    provider:string
  ){

    return this.providers.get(
      provider
    )

  }

  all(){

    return [
      ...this.providers.values()
    ]

  }

}
