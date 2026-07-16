import {
  GoogleCapability,
} from "../base/google-capability"

import type {
  PermissionScope,
} from "@/lib/security/permissions/types"

import {
  GoogleDriveService,
} from "@/lib/integrations/google/services/drive-service"



export class DriveCapability
 extends GoogleCapability {


 readonly id =
  "google.drive"


 readonly name =
  "Google Drive Assistant"


 readonly permissions:
 readonly PermissionScope[] = [

  "drive.read",
  "drive.write"

 ]


 constructor(
  client:any,
  private readonly driveService:
    GoogleDriveService
 ){

  super(client)

 }



 async execute(
  input:unknown,
  context:any
 ){


  const action =
   (input as any)?.action



  if(action === "search"){

   return this.driveService.searchFiles(
    (input as any)?.query ?? "",
    context
   )

  }


  return {

   status:"ready",

   capability:"drive"

  }


 }


}
