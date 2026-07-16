import type {
  ContextBuilder,
} from "../../builders/types"

import type {
  ContextBuilderRegistry,
} from "../../registry/types"

export class DefaultContextBuilderRegistry
  implements ContextBuilderRegistry {

  private readonly builders:
    ContextBuilder[] = []

  register(
    builder: ContextBuilder
  ): void {

    const exists =
      this.builders.some(
        b => b.name === builder.name
      )

    if (exists) {
      throw new Error(
        `Builder '${builder.name}' already registered`
      )
    }

    this.builders.push(builder)

  }

  unregister(
    name: string
  ): void {

    const index =
      this.builders.findIndex(
        b => b.name === name
      )

    if(index >= 0){
      this.builders.splice(index,1)
    }

  }

  getBuilders(){

    return [...this.builders]

  }

}
