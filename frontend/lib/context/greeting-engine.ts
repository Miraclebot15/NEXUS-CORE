/**
 * NEXUS CORE
 * Contextual Greeting Intelligence Engine
 *
 * Enterprise adaptive greeting system.
 * Handles time, timezone, user context,
 * activity, events, and future integrations.
 */


export type GreetingMood =
  | "fresh"
  | "focused"
  | "creative"
  | "deep_work"
  | "relaxed"
  | "welcome_back"
  | "celebration"
  | "night_owl"


export interface GreetingContext {

  userName?: string

  /**
   * User timezone
   * Examples:
   * Africa/Lagos
   * America/New_York
   * Asia/Tokyo
   */
  timezone?: string


  /**
   * Last workspace activity
   */
  lastActive?: Date


  /**
   * Current session duration
   */
  sessionMinutes?: number


  /**
   * Productivity metrics
   */
  completedTasks?: number

  activeTasks?: number


  /**
   * Future weather intelligence
   */
  weather?: {
    condition?: string
    temperature?: number
  }


  /**
   * Future calendar intelligence
   */
  event?: {
    name?: string
  }

}


export interface GreetingResult {

  headline: string

  subtitle: string

  mood: GreetingMood

  context: {
    period: string
    timezone: string
    reason: string[]
  }

}
const PERIODS = {
  EARLY_MORNING: {
    label: "Early Morning",
    start: 0,
    end: 5,
  },

  MORNING: {
    label: "Morning",
    start: 5,
    end: 12,
  },

  AFTERNOON: {
    label: "Afternoon",
    start: 12,
    end: 17,
  },

  EVENING: {
    label: "Evening",
    start: 17,
    end: 21,
  },

  NIGHT: {
    label: "Night",
    start: 21,
    end: 24,
  },
}


function getTimeInTimezone(timezone?: string): Date {

  try {

    if (!timezone) {
      return new Date()
    }

    const now = new Date()

    const formatted = new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }
    ).formatToParts(now)


    const values: Record<string,string> = {}

    formatted.forEach(part => {
      if (part.type !== "literal") {
        values[part.type] = part.value
      }
    })


    return new Date(
      `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`
    )


  } catch {

    return new Date()

  }

}



function detectPeriod(hour:number) {

  for (const key of Object.keys(PERIODS)) {

    const period =
      PERIODS[key as keyof typeof PERIODS]

    if (
      hour >= period.start &&
      hour < period.end
    ) {
      return period.label
    }

  }

  return "Unknown"

}
function buildTimeGreeting(
  period:string,
  context: GreetingContext
): {
  headline:string
  subtitle:string
  mood:GreetingMood
  reason:string[]
} {

  const reasons:string[] = []


  switch(period) {


    case "Early Morning":

      reasons.push("deep night / early hours detected")

      return {
        headline:
          context.userName
            ? `Still awake, ${context.userName}?`
            : "Still awake?",

        subtitle:
          "The quiet hours are perfect for deep thinking and creation.",

        mood:"night_owl",

        reason: reasons,
      }



    case "Morning":

      reasons.push("morning productivity window")

      return {

        headline:
          context.userName
            ? `Good Morning, ${context.userName}.`
            : "Good Morning.",

        subtitle:
          "A fresh session begins. What shall we build today?",

        mood:"fresh",

        reason:reasons,
      }



    case "Afternoon":

      reasons.push("midday activity window")

      return {

        headline:
          context.userName
            ? `Good Afternoon, ${context.userName}.`
            : "Good Afternoon.",

        subtitle:
          "Momentum is building. Let's keep creating.",

        mood:"focused",

        reason:reasons,
      }



    case "Evening":

      reasons.push("evening creative window")

      return {

        headline:
          context.userName
            ? `Good Evening, ${context.userName}.`
            : "Good Evening.",


        subtitle:
          "A great time to review, improve, and innovate.",


        mood:"creative",

        reason:reasons,
      }



    case "Night":

      reasons.push("night session detected")


      return {

        headline:
          context.userName
            ? `Late Night, ${context.userName}.`
            : "Late Night.",


        subtitle:
          "Quiet hours. Perfect for focused work and exploration.",


        mood:"deep_work",

        reason:reasons,
      }


    default:

      return {

        headline:"Welcome back.",

        subtitle:
          "Ready for another intelligent session?",

        mood:"welcome_back",

        reason:[
          "fallback greeting"
        ],
      }

  }

}
function applyContextIntelligence(
  base:{
    headline:string
    subtitle:string
    mood:GreetingMood
    reason:string[]
  },
  context:GreetingContext
){

  const reasons = [
    ...base.reason
  ]


  let subtitle = base.subtitle



  // Returning users

  if (
    context.lastActive
  ) {

    const elapsed =
      Date.now() -
      context.lastActive.getTime()


    const hours =
      elapsed / (1000 * 60 * 60)


    if (hours > 24) {

      subtitle =
        "Welcome back. A lot can change between sessions."

      reasons.push(
        "user returning after long absence"
      )

    }

  }



  // Productivity awareness

  if (
    context.completedTasks &&
    context.completedTasks > 5
  ) {

    subtitle =
      "Strong momentum today. Keep pushing the frontier."

    reasons.push(
      "high productivity detected"
    )

  }



  // Active workload awareness

  if (
    context.activeTasks &&
    context.activeTasks > 3
  ){

    subtitle =
      "Multiple missions active. Let's orchestrate them."

    reasons.push(
      "multiple active tasks"
    )

  }



  // Weather intelligence placeholder

  if (
    context.weather?.condition
  ){

    reasons.push(
      `weather detected: ${context.weather.condition}`
    )


    if (
      context.weather.condition
        .toLowerCase()
        .includes("rain")
    ){

      subtitle =
        "Rain outside. A perfect atmosphere for deep focus."

    }

  }



  // Calendar intelligence placeholder

  if (
    context.event?.name
  ){

    subtitle =
      `Upcoming: ${context.event.name}. Let's prepare.`


    reasons.push(
      "calendar event detected"
    )

  }



  return {

    ...base,

    subtitle,

    reason:reasons,

  }

}



export function generateGreeting(
  context:GreetingContext = {}
):GreetingResult {


  const now =
    getTimeInTimezone(
      context.timezone
    )


  const hour =
    now.getHours()


  const period =
    detectPeriod(hour)


  const base =
    buildTimeGreeting(
      period,
      context
    )


  const enhanced =
    applyContextIntelligence(
      base,
      context
    )


  return {

    headline:
      enhanced.headline,


    subtitle:
      enhanced.subtitle,


    mood:
      enhanced.mood,


    context:{

      period,

      timezone:
        context.timezone ||
        Intl.DateTimeFormat()
          .resolvedOptions()
          .timeZone,


      reason:
        enhanced.reason,

    }

  }

}
function detectSeason(
  date:Date
){

  const month =
    date.getMonth() + 1


  if (
    month === 12 ||
    month <= 2
  ){

    return "winter"

  }


  if (
    month >= 3 &&
    month <= 5
  ){

    return "spring"

  }


  if (
    month >= 6 &&
    month <= 8
  ){

    return "summer"

  }


  return "autumn"

}



function getSeasonalMessage(
  season:string
){

  switch(season){

    case "spring":

      return "A season of growth and new ideas."


    case "summer":

      return "High energy season. Perfect for building."


    case "autumn":

      return "A great time for refinement and strategy."


    case "winter":

      return "Quiet season. Perfect for deep work."


    default:

      return ""

  }

}



export function getAdaptiveGreeting(
  context:GreetingContext = {}
){

  const result =
    generateGreeting(context)


  const date =
    getTimeInTimezone(
      context.timezone
    )


  const season =
    detectSeason(date)



  const seasonal =
    getSeasonalMessage(
      season
    )


  return {

    ...result,


    subtitle:
      seasonal
        ? `${result.subtitle} ${seasonal}`
        : result.subtitle,


    context:{

      ...result.context,

      season,

    }

  }

}
