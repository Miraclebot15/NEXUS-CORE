export interface CostRequest{

  capability:string

  modelTier:
    "cheap" |
    "balanced" |
    "flagship"

  complexity:
    "low" |
    "medium" |
    "high"

  modality:
    "text" |
    "image" |
    "video" |
    "audio" |
    "vision" |
    "tool"

}


export interface CostResult{

  units:number

  reason:string

}
