import type { ContextBuilder } from "../builders/types"

export interface ContextBuilderRegistry {

  register(
    builder: ContextBuilder
  ): void

  unregister(
    name: string
  ): void

  getBuilders(): ContextBuilder[]

}
