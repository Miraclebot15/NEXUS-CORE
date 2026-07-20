export interface AIPlan{

  id:string

  name:string

  dailyTokens:number

  monthlyTokens:number

  imageGenerations:number

  uploads:number

  maxModelTier:
    "cheap" |
    "balanced" |
    "flagship"

}
