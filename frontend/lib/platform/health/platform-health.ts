import type {
  ProviderHealthRegistry,
} from "./provider-health"

export class PlatformHealth{

  constructor(

    private readonly providers:
      ProviderHealthRegistry

  ){}

  healthy(){

    return this.providers
      .all()
      .every(
        provider=>
          provider.healthy
      )

  }

}
