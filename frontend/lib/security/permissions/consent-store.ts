import type {
  UserConsent,
} from "./types"



export class ConsentStore {


  private readonly consents:
    Map<string,UserConsent> =
      new Map()



  save(
    consent:UserConsent
  ){

    this.consents.set(
      consent.userId,
      consent
    )

  }



  get(
    userId:string
  ){

    return this.consents.get(
      userId
    )

  }



  remove(
    userId:string
  ){

    this.consents.delete(
      userId
    )

  }


}
