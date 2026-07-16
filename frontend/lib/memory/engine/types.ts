import type { MemoryEntry } from "../types"

export interface ContextPacket {

  userId?: string

  projectId?: string

  conversationId?: string

  memories: MemoryEntry[]

  metadata: Record<string, unknown>

}

export interface ContextEngine {

  buildContext(
    packet: ContextPacket
  ): Promise<ContextPacket>

}
