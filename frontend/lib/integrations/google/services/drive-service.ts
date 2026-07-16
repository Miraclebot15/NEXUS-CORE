import {
  GoogleClient,
} from "../google-client"



export class GoogleDriveService {


  constructor(
    private readonly client:
      GoogleClient
  ){}



  async searchFiles(
    query:string,
    context:any
  ){


    const encoded =
      encodeURIComponent(query)



    return this.client.request(

      `https://www.googleapis.com/drive/v3/files?q=name contains '${encoded}'&fields=files(id,name,mimeType)`,

      {
        service:"drive",
        userId:
          context?.userId,
        accessToken:
          context?.accessToken
      }

    )


  }


}
