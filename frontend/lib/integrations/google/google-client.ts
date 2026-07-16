import {
  GoogleAuthManager,
} from "./google-auth"


import type {
  GoogleClientConfig,
  GoogleRequestContext,
} from "./types"



export class GoogleClient {


  private readonly auth:
    GoogleAuthManager



  constructor(
    config: GoogleClientConfig
  ){

    this.auth =
      new GoogleAuthManager(
        config
      )

  }



  async request(
    url:string,
    context:GoogleRequestContext
  ){


    const headers:
      Record<string,string> = {}



    const token =
      context.accessToken ??
      this.auth.getAccessToken()



    if(token){

      headers.Authorization =
        `Bearer ${token}`

    }



    const apiKey =
      this.auth.getApiKey()



    const separator =
      url.includes("?")
      ? "&"
      : "?"



    const finalUrl =
      apiKey && !token
      ? `${url}${separator}key=${apiKey}`
      : url



    const response =
      await fetch(
        finalUrl,
        {
          headers,
        }
      )



    if(!response.ok){

      throw new Error(
        `Google API error ${response.status}`
      )

    }



    return response.json()

  }


}
