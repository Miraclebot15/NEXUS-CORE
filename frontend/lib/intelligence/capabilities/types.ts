export interface CapabilityContext{
  userId:string
  conversationId?:string
  input:string
  model:string
  metadata?:Record<string,unknown>
}

export interface CapabilityResult{
  success:boolean
  output:unknown
  tokensUsed:number
  model:string
}

export interface IntelligenceCapability{

  id:string

  name:string

  execute(
    context:CapabilityContext
  ):Promise<CapabilityResult>

}
