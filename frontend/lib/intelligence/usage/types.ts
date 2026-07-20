export type UsageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "vision"
  | "tool"


export interface UsageTransaction{


  id:string


  userId:string


  type:UsageType


  amount:number


  model?:string


  capability?:string


  metadata?:Record<string,unknown>


  createdAt:number

}



export interface UsageBalance{


  text:number

  image:number

  video:number

  audio:number

  vision:number

  tool:number


}
