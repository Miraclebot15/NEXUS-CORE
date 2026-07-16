import {
  DefaultContextBuilderRegistry,
} from "@/lib/memory/engine/core/registry/context-builder-registry"

import {
  CapabilityRegistry,
} from "../registry"


import {
  CapabilityManager,
} from "../manager"


export class NexusRuntime {


  readonly capabilityRegistry:
    CapabilityRegistry


  readonly capabilityManager:
    CapabilityManager


  readonly contextRegistry:
    DefaultContextBuilderRegistry


  constructor(){

    this.capabilityRegistry =
      new CapabilityRegistry()


    this.capabilityManager =
      new CapabilityManager(
        this.capabilityRegistry
      )


    this.contextRegistry =
      new DefaultContextBuilderRegistry()

  }


}
