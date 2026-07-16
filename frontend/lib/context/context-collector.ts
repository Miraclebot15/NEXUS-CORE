import type { NexusMessage } from '@/lib/use-nexus-workspace'

export interface WorkspaceContextInput {
  projects?: any[]
  activeProjectId?: string | null
  messages?: NexusMessage[]
  status?: string
}


export function collectWorkspaceContext(
  input: WorkspaceContextInput
){

  const texts =
    input.messages
      ?.slice(-10)
      .map(
        m => m.parts
          .map(p => p.text)
          .join(" ")
      )
      ?? []


  const recentActions:string[] = []


  const combined =
    texts.join(" ").toLowerCase()


  if(
    combined.includes("code") ||
    combined.includes("bug") ||
    combined.includes("debug")
  ){
    recentActions.push("coding")
  }


  if(
    combined.includes("design") ||
    combined.includes("ui") ||
    combined.includes("frontend")
  ){
    recentActions.push("design")
  }


  if(
    combined.includes("research") ||
    combined.includes("learn")
  ){
    recentActions.push("research")
  }


  return {

    recentActions,

    recentTopics:
      texts.slice(-5),

    activeProjects:
      input.projects
        ?.map(p => p.name)
        .filter(Boolean)
        ?? [],

    activeTasks:
      input.status === "streaming"
        ? 1
        : 0,

  }

}
