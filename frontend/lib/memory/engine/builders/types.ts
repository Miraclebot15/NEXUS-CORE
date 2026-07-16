import type { ContextPacket } from "../types"

export type ContextCapability =
  | "memory"
  | "workspace"
  | "conversation"
  | "retrieval"
  | "personality"
  | "sandbox"
  | "safety"
  | "governance"
  | "tools"

export interface ContextBuilder {

  readonly name: string

  readonly capability: ContextCapability

  readonly priority: number

  readonly parallel?: boolean

  readonly optional?: boolean

  readonly dependsOn?: string[]

  build(
    packet: ContextPacket
  ): Promise<ContextPacket>

}
