import {
 extractMemoryCandidate,
} from "./extractor"


import {
 scoreImportance,
} from "./importance"


import type {
 LifecycleResult,
} from "./types"



export class MemoryLifecycleEngine {


async process(
 text:string
):Promise<LifecycleResult>{


const candidate =
 extractMemoryCandidate(text)



if(!candidate){

 return {

  decision:
   "ignore",

  reason:
   "No meaningful memory detected"

 }

}



candidate.importance =
 scoreImportance(candidate)



if(
 candidate.confidence < 0.4
){

 return {

  decision:
   "confirm",

  candidate,

  reason:
   "Low confidence memory"

 }

}



return {

 decision:
  "remember",

 candidate,

 reason:
  "Memory passed lifecycle checks"

}


}


}
