export interface AIProviderRequest{

  model:string

  input:string

  systemPrompt?:string

  maxTokens?:number

  temperature?:number

  userId?:string

  conversationId?:string

  metadata?:Record<string,unknown>

}



export interface AIProviderResponse{

  output:string

  model:string

  tokensUsed:number

  finishReason?:string

}



export interface AIProvider{

  id:string

  name:string


  available():boolean


  execute(
    request:AIProviderRequest
  ):Promise<AIProviderResponse>


}
