import type {
  IntentAnalysis,
} from "./types"



export class IntentRouter {


  analyze(
    input: string
  ): IntentAnalysis {


    const text =
      input.toLowerCase()



    if (
      text.includes("youtube") ||
      text.includes("video")
    ){

      return {
        category: "video",
        confidence: 0.8,
        requiresFreshData: true,
        requiresTools: true,
        preferredCapability:
          "youtube"
      }

    }



    if (
      text.includes("code") ||
      text.includes("build") ||
      text.includes("app")
    ){

      return {
        category: "coding",
        confidence: 0.8,
        requiresFreshData: false,
        requiresTools: true,
        preferredCapability:
          "developer"
      }

    }



    if (
      text.includes("latest") ||
      text.includes("today") ||
      text.includes("current")
    ){

      return {
        category: "search",
        confidence: 0.9,
        requiresFreshData: true,
        requiresTools: true
      }

    }



    return {
      category: "general",
      confidence: 0.5,
      requiresFreshData: false,
      requiresTools: false
    }

  }

}
