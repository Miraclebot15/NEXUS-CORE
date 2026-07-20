import type{
  MemoryCandidate,
} from "./types"

export class MemoryExtractor{

  extract(
    input:string
  ):MemoryCandidate[]{

    const candidates:MemoryCandidate[] = []

    const text =
      input.trim()

    if(
      text.length < 8
    ){
      return candidates
    }

    candidates.push({

      content:text,

      confidence:0.40

    })

    return candidates

  }

}
