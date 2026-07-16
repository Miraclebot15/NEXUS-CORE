import type {
  ContextEngine,
  ContextPacket,
} from "../types"

import type {
  ContextBuilderRegistry,
} from "../registry/types"

import {
  sortBuilders,
  splitBuilders,
} from "../scheduler"


export class DefaultContextEngine
implements ContextEngine {


constructor(
 private readonly registry:
 ContextBuilderRegistry
){}


async buildContext(
 packet: ContextPacket
): Promise<ContextPacket>{


let builders =
 this.registry.getBuilders()


builders =
 sortBuilders(builders)


const {
 parallel,
 sequential
} =
 splitBuilders(builders)



if(parallel.length){

 const results =
 await Promise.all(

  parallel.map(
   builder =>
    builder.build(packet)
  )

 )


 for(const result of results){

  packet =
   result

 }

}



for(const builder of sequential){

 packet =
  await builder.build(packet)

}


return packet


}


}
