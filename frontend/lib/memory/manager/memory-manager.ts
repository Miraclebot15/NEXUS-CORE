import type {
  MemoryEntry,
} from "../types"


import type {
  MemoryStore,
} from "../store/memory-store"


import type {
  MemoryIdentity,
} from "../identity/types"


import {
  resolveScope,
} from "../scopes/resolver"



export class MemoryManager {


constructor(
 private readonly store: MemoryStore
){}



async remember(
 identity: MemoryIdentity,
 memory: MemoryEntry
){


const scopeId =
 resolveScope({

  identity,

  scope:
   memory.scope,

 })


await this.store.save({

 ...memory,

 metadata: {

  ...memory.metadata,

  scopeId,

 }

})


}



async forget(
 id:string
){

 await this.store.delete(id)

}



async recall(
 identity: MemoryIdentity
){

return this.store.search({

 userId:
  identity.userId,

})

}



}
