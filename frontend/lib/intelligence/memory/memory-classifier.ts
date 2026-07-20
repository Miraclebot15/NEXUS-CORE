import type{
  MemoryCandidate,
  MemoryType,
} from "./types"

export class MemoryClassifier{

  classify(
    candidate:MemoryCandidate
  ):MemoryCandidate{

    const text =
      candidate.content.toLowerCase()

    let type:MemoryType = "conversation"

    if(
      text.includes("my name") ||
      text.includes("i am")
    ){
      type = "identity"
    }

    else if(
      text.includes("i like") ||
      text.includes("i prefer") ||
      text.includes("favorite")
    ){
      type = "preference"
    }

    else if(
      text.includes("project") ||
      text.includes("building")
    ){
      type = "project"
    }

    else if(
      text.includes("goal") ||
      text.includes("want to")
    ){
      type = "goal"
    }

    return{

      ...candidate,

      type

    }

  }

}
