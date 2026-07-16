export type RetrievalProviderType =
  | "web"
  | "youtube"
  | "documents"
  | "knowledge"


export interface RetrievalSource {

  title:string

  url?:string

  content:string

  provider:
    RetrievalProviderType

  confidence:number

  timestamp?:string

}


export interface RetrievalProvider {


  readonly name:string


  readonly type:
    RetrievalProviderType


  search(
    query:string
  ):Promise<RetrievalSource[]>


}
