export type PermissionScope =

  | "gmail.read"
  | "gmail.send"
  | "gmail.modify"

  | "drive.read"
  | "drive.write"

  | "calendar.read"
  | "calendar.write"

  | "sheets.read"
  | "sheets.write"

  | "slides.read"
  | "slides.write"

  | "youtube.read"

  | "maps.read"



export interface UserConsent {

  userId:string

  permissions:PermissionScope[]

  grantedAt:number

  expiresAt?:number

}
