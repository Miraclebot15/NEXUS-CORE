export interface AdaptivePromptContext {

  timezone?: string

  currentHour?: number

  season?: string

  weather?: {
    condition?: string
    temperature?: number
  }

  userName?: string

  recentActions?: string[]

  recentTopics?: string[]

  activeProjects?: string[]

  calendarEvent?: {
    name?: string
    time?: string
  }

  completedTasks?: number

  activeTasks?: number

}


export interface AdaptivePrompt {

  text: string

  category: string

  reason: string

  priority: "low" | "medium" | "high"

  confidence: number

}


function getTimeContext(hour:number){

  if(hour < 5)
    return "late_night"

  if(hour < 12)
    return "morning"

  if(hour < 17)
    return "afternoon"

  if(hour < 21)
    return "evening"

  return "night"

}



function analyzeContext(
  context: AdaptivePromptContext
){

  const hour =
    context.currentHour ??
    new Date().getHours()


  return {
    period:getTimeContext(hour)
  }

}




function getPriorityWeight(
  priority: "low" | "medium" | "high"
){
  if(priority === "high") return 3
  if(priority === "medium") return 2
  return 1
}


function calculateIntelligenceScore(
  prompt: AdaptivePrompt
){
  return (
    getPriorityWeight(prompt.priority)
    *
    prompt.confidence
  )
}


export function generateAdaptivePrompts(
  context: AdaptivePromptContext = {}
): AdaptivePrompt[] {


  const intelligence =
    analyzeContext(context)


  const suggestions:AdaptivePrompt[] = []



  if(
    intelligence.period === "late_night" &&
    context.activeProjects?.length
  ){

    suggestions.push({

      text:
      "Still building this late? Want me to review your current project architecture or plan the next improvements?",

      category:"engineering",

      reason:
      "Late-night activity detected with active projects",

      priority:"high",

      confidence:0.92

    })

  }



  if(
    context.recentActions?.includes("coding")
  ){

    suggestions.push({

      text:
      "Continue engineering work? I can help debug, optimize, or improve your system.",

      category:"development",

      reason:
      "Recent coding activity detected",

      priority:"high",

      confidence:0.85

    })

  }



  if(
    context.calendarEvent?.name
  ){

    suggestions.push({

      text:
      `You have ${context.calendarEvent.name}. Want me to help you prepare?`,

      category:"planning",

      reason:
      "Calendar event detected",

      priority:"medium",

      confidence:0.75

    })

  }



  if(
    suggestions.length === 0
  ){

    suggestions.push({

      text:
      "What are we building today?",

      category:"general",

      reason:
      "No personal context available",

      priority:"low",

      confidence:0.20

    })

  }



  suggestions.sort((a, b) => {
    return (
      calculateIntelligenceScore(b) -
      calculateIntelligenceScore(a)
    )
  })

  return suggestions

}
