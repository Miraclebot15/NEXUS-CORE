import {
  Feature,
} from "../entitlements/types/entitlements"


export interface AIExecutionContext{

  requestId:string

  userId:string

  feature:Feature

  provider?:string

  timestamp:number

  trial:boolean

}
