export interface ExecutionResult<T = unknown>{

  success:boolean

  data?:T

  error?:string

  completedAt:number

}
