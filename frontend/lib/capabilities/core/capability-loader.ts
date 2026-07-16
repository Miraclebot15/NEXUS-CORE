import {
  CapabilityRegistry,
} from "../registry"

import {
  CapabilityManager,
} from "../manager"


export interface CapabilityLoader {

  load(
    registry: CapabilityRegistry
  ): Promise<void>

}


export class DefaultCapabilityLoader
  implements CapabilityLoader {


  async load(
    registry: CapabilityRegistry
  ): Promise<void> {


    const manager =
      new CapabilityManager(
        registry
      )


    void manager

  }

}
