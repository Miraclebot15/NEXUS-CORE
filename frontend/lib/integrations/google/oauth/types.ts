export interface GoogleOAuthSession {

  accessToken:string

  refreshToken?:string

  expiresAt:number

  scopes:string[]

}


export interface GoogleOAuthConfig {

  clientId:string

  clientSecret:string

  redirectUri:string

}
