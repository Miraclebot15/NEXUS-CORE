import type {
  MemoryIdentity,
} from "./types"


export class DefaultMemoryIdentity {


  create(
    identity: MemoryIdentity
  ): string {

    return [
      identity.userId,
      identity.workspaceId ?? "personal",
      identity.organizationId ?? "default",
    ]
    .join(":")

  }


}
