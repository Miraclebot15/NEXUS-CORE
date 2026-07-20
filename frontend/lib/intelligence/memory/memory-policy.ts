import type{
  MemoryCandidate,
} from "./types"

export class MemoryPolicy{

  shouldStore(
    candidate:MemoryCandidate
  ):boolean{

    if(
      candidate.confidence < 0.60
    ){
      return false
    }

    return candidate.type !== "conversation"

  }

}
