import type{
  MemoryCandidate,
} from "./types"

export class MemoryScorer{

  score(
    candidate:MemoryCandidate
  ):number{

    let score = 50

    switch(candidate.type){

      case "identity":
        score += 40
        break

      case "project":
        score += 35
        break

      case "goal":
        score += 30
        break

      case "preference":
        score += 25
        break

      case "skill":
        score += 20
        break

      default:
        score += 0

    }

    score += Math.round(
      candidate.confidence * 10
    )

    return Math.min(
      score,
      100
    )

  }

}
