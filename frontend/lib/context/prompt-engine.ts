export interface PromptContext {
  timezone?: string
  hour?: number
  season?: string
  recentActions?: string[]
  userName?: string
}


export interface GeneratedPrompt {
  text: string
  category: string
  reason: string
}


const PROMPT_LIBRARY: GeneratedPrompt[] = [

  {
    text: "Explore the latest breakthroughs in artificial intelligence...",
    category: "research",
    reason: "Keeps the user updated with AI trends"
  },

  {
    text: "Design a new feature for your next big project...",
    category: "creation",
    reason: "Encourages building"
  },

  {
    text: "Review and improve your existing code architecture...",
    category: "engineering",
    reason: "Promotes software improvement"
  },

  {
    text: "Generate ideas for your next innovation...",
    category: "ideation",
    reason: "Encourages creativity"
  },

  {
    text: "Analyze a complex problem and create a solution...",
    category: "problem-solving",
    reason: "Encourages reasoning"
  },

  {
    text: "Learn something new and expand your technical skills...",
    category: "learning",
    reason: "Encourages growth"
  },

  {
    text: "Create a strategy for your next project milestone...",
    category: "planning",
    reason: "Supports execution"
  },

  {
    text: "Visualize a futuristic concept and bring it to life...",
    category: "creative",
    reason: "Supports imagination"
  },

]


export function generatePrompts(
  context: PromptContext = {}
): GeneratedPrompt[] {

  let prompts = [...PROMPT_LIBRARY]


  const hour =
    context.hour ?? new Date().getHours()


  if (hour < 5) {
    prompts.unshift({
      text:
        "Late night deep work detected. Continue refining your ideas with focus...",
      category:"time-aware",
      reason:"Adapts to late hours"
    })
  }


  if (hour >= 5 && hour < 12) {
    prompts.unshift({
      text:
        "Start the day by turning your ideas into execution...",
      category:"morning",
      reason:"Morning motivation"
    })
  }


  return prompts
}
