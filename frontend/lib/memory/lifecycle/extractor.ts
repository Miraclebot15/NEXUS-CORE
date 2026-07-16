import type {
  MemoryCandidate,
} from "./types"


export function extractMemoryCandidate(
  text:string
): MemoryCandidate | null {


const trimmed =
 text.trim()


if(!trimmed){
  return null
}


if(
 trimmed.length < 15
){
 return null
}


return {

 content: trimmed,

 type: "fact",

 importance: "medium",

 confidence: 0.5,

 tags:[
  "auto-extracted"
 ]

}


}
