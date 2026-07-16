import type {
  GoogleClientConfig,
} from "./types"

import {
  GoogleTokenManager,
} from "./oauth/token-manager"

import type {
  GoogleOAuthSession,
} from "./oauth/types"



export class GoogleAuthManager {


  private readonly tokenManager?:
    GoogleTokenManager



  constructor(
    private readonly config:
      GoogleClientConfig,
    session?: GoogleOAuthSession
  ){

    if(session){

      this.tokenManager =
        new GoogleTokenManager(
          session
        )

    }

  }



  getApiKey(){

    return this.config.apiKey

  }



  getAccessToken(){

    return (
      this.tokenManager
        ?.getAccessToken()
      ??
      this.config.accessToken
    )

  }



  updateOAuthSession(
    session:GoogleOAuthSession
  ){

    if(this.tokenManager){

      this.tokenManager.update(
        session
      )

      return

    }


    throw new Error(
      "OAuth session manager not initialized"
    )

  }



  getOAuthSession(){

    return this.tokenManager
      ?.getSession()

  }



  isConfigured(){

    return Boolean(
      this.config.apiKey ||
      this.getAccessToken()
    )

  }


}
