import { DefaultContextEngine }
from "../core/context-engine"

import { DefaultContextBuilderRegistry }
from "../core/registry/context-builder-registry"

import { DummyContextBuilder }
from "../builders/system/dummy-builder"

async function main(){

  const registry =
    new DefaultContextBuilderRegistry()

  registry.register(
    new DummyContextBuilder()
  )

  const engine =
    new DefaultContextEngine(
      registry
    )

  const packet = {

    memories: [],

    metadata: {},

  }

  const result =
    await engine.buildContext(packet)

  console.log(result)

}

main()
