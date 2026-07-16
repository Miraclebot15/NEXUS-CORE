import type {
  GoogleOAuthSession,
} from "./types"



export class GoogleTokenManager {


  constructor(
    private session:
      GoogleOAuthSession
  ){}



  getAccessToken(){

    if(
      Date.now() <
      this.session.expiresAt
    ){

      return this.session.accessToken

    }


    return null

  }



  update(
    session:GoogleOAuthSession
  ){

    this.session =
      session

  }


  getSession(){

    return this.session

  }


}
