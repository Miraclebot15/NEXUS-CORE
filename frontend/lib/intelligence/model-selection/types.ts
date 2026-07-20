export type ModelTier =
  | "cheap"
  | "balanced"
  | "flagship"


export interface ModelSelection{

  capability:string

  tier:ModelTier

  model:string

}
