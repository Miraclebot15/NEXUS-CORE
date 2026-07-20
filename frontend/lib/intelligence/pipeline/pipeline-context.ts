export interface PipelineContext{

  userId:string

  conversationId?:string

  input:string


  metadata?:Record<
    string,
    unknown
  >


  createdAt:number

}
