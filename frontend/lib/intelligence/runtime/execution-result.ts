export interface RuntimeExecutionResult{

  success:boolean


  output?:unknown


  model?:string


  capability?:string


  tokensUsed?:number


  costUnits?:number


  error?:string


  completedAt:number

}
