import type {
  MemoryCandidate,
} from "./types"


export function scoreImportance(
 candidate: MemoryCandidate
){

const length =
 candidate.content.length


if(length > 200){

 return "high"

}


if(length > 50){

 return "medium"

}


return "low"

}
