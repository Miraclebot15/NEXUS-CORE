export interface TaskCostRequest{

  capability:string

  complexity:
    "low" |
    "medium" |
    "high"

  hasFile?:boolean

  requiresVision?:boolean

}


export interface TaskCostEstimate{

  estimatedTokens:number

  estimatedImages:number

  estimatedUploads:number

}
