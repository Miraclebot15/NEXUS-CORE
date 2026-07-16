import type {
  FreshnessAnalysis,
} from "./types"



export class FreshnessEngine {


  analyze(
    input: string
  ): FreshnessAnalysis {


    const text =
      input.toLowerCase()



    const liveKeywords = [
      "today",
      "now",
      "current",
      "latest",
      "score",
      "weather",
      "price",
      "stock",
      "news",
      "winner",
      "match"
    ]


    const requiresLive =
      liveKeywords.some(
        word =>
          text.includes(word)
      )


    if(requiresLive){

      return {

        level:"live",

        requiresRetrieval:true,

        reason:
          "Information may change rapidly",

        maxAgeMinutes:60

      }

    }


    return {

      level:"static",

      requiresRetrieval:false,

      reason:
        "Information is unlikely to change"

    }

  }

}
