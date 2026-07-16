import type {
  ContextBuilder,
} from "../types"

import type {
  ContextPacket,
} from "../../types"

export class DummyContextBuilder
  implements ContextBuilder {

  readonly name = "dummy"

  readonly capability = "memory"

  readonly priority = 1

  async build(
    packet: ContextPacket
  ): Promise<ContextPacket> {

    packet.metadata = {
      ...packet.metadata,
      dummy: true,
    }

    return packet

  }

}
