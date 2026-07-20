export interface ExecutionContext{

  userId:string

  requestId:string

  conversationId?:string


  input:string


  userPlan:
    | "free"
    | "starter"
    | "pro"
    | "enterprise"


  remainingTokens:number


  userRole?:
    | "user"
    | "developer"


  metadata?:Record<
    string,
    unknown
  >


  createdAt:number

}
