import type {
  MemoryScope,
} from "../types"

import type {
  MemoryIdentity,
} from "../identity/types"


export interface ScopeContext {

  identity: MemoryIdentity

  scope: MemoryScope

}


export function resolveScope(
  context: ScopeContext
): string {


switch(context.scope){

case "user":

return context.identity.userId


case "workspace":

return (
 context.identity.workspaceId
 ??
 context.identity.userId
)


case "global":

return "global"


case "project":

return (
 context.identity.workspaceId
 ??
 context.identity.userId
)


default:

return (
 context.identity.sessionId
 ??
 context.identity.userId
)

}


}
