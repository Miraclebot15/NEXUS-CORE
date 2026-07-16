import type {
  ProviderHealthRegistry,
} from "./provider-health"

export class Diagnostics{

  constructor(

    private readonly providers:
      ProviderHealthRegistry

  ){}

  report(){

    return{

      timestamp:Date.now(),

      providers:
        this.providers.all(),

    }

  }

}
