import {
  ProviderRegistry,
} from "../provider-registry"


import {
  QwenProvider,
} from "../qwen-provider"



export class ProviderBootstrap{


  static initialize(){

    const registry =
      new ProviderRegistry()


    registry.register(
      new QwenProvider()
    )


    return registry

  }


}
