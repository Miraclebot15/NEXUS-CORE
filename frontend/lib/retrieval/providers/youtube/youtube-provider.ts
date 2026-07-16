import type {
  RetrievalProvider,
  RetrievalSource,
} from "../types"


import {
  GoogleClient,
} from "@/lib/integrations/google/google-client"



export class YouTubeProvider
  implements RetrievalProvider {


  readonly name =
    "youtube"


  readonly type =
    "youtube" as const



  constructor(
    private readonly client:
      GoogleClient
  ){}



  async search(
    query:string
  ):Promise<RetrievalSource[]> {


    const data =
      await this.client.request(
        "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=" +
        encodeURIComponent(query),

        {
          service:"youtube"
        }
      )



    return (
      data.items ?? []
    ).map(
      (item:any)=>({

        title:
          item.snippet.title,

        url:
          `https://youtube.com/watch?v=${item.id.videoId}`,

        content:
          item.snippet.description ?? "",

        provider:
          "youtube",

        confidence:
          0.85,

        timestamp:
          item.snippet.publishedAt

      })
    )


  }


}
