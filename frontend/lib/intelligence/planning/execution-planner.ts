import type {
  ExecutionPlan,
} from "../orchestrator"


import type {
  IntelligenceExecutionPlan,
} from "./types"



export class ExecutionPlanner{


  create(
    plan:ExecutionPlan
  ):IntelligenceExecutionPlan{


    const tasks =
      []


    switch(plan.intent){


      case "coding":

        tasks.push(
          {
            name:"analyze request",
            capability:"developer",
            order:1
          },

          {
            name:"generate solution",
            capability:"qwen-coder",
            order:2
          },

          {
            name:"validate output",
            capability:"validator",
            order:3
          }
        )

        break



      case "research":

        tasks.push(
          {
            name:"collect sources",
            capability:"retrieval",
            order:1
          },

          {
            name:"reason over context",
            capability:"qwen",
            order:2
          }
        )

        break



      default:

        tasks.push(
          {
            name:"generate response",
            capability:"qwen",
            order:1
          }
        )

    }


    return {

      ...plan,

      tasks

    }

  }

}
