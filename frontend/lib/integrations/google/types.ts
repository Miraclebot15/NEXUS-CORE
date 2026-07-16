export type GoogleService =
  | "youtube"
  | "drive"
  | "gmail"
  | "calendar"
  | "sheets"
  | "slides"
  | "maps"


export interface GoogleClientConfig {

  apiKey?: string

  accessToken?: string

  clientId?: string

  clientSecret?: string

  redirectUri?: string

}


export interface GoogleRequestContext {

  service: GoogleService

  userId?: string

  accessToken?: string

}
