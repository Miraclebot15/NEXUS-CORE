import type {
  IntelligenceIntent,
  IntelligenceRequest,
  ExecutionPlan,
} from "./types"


export class DecisionEngine{


  decide(
    request:IntelligenceRequest
  ):ExecutionPlan{


    const input =
      request.input.toLowerCase()


    let intent:IntelligenceIntent =
      "chat"


    if(
      input.includes("code") ||
      input.includes("bug") ||
      input.includes("function")
    ){

      intent =
        "coding"

    }


    else if(
      input.includes("research") ||
      input.includes("analyze")
    ){

      intent =
        "research"

    }


    else if(
      input.includes("search") ||
      input.includes("find")
    ){

      intent =
        "tool_execution"

    }


    return {

      intent,

      requiresMemory:true,

      requiresTools:
        intent === "tool_execution",

      createdAt:
        Date.now()

    }

  }

}
