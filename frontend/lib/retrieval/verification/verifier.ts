import type {
  RetrievalSource,
} from "../providers/types"


export interface VerificationResult {

  verified:boolean

  confidence:number

  reason:string

}


export class RetrievalVerifier {


  verify(
    source: RetrievalSource
  ):VerificationResult {


    if(
      !source.content ||
      source.content.length < 50
    ){

      return {

        verified:false,

        confidence:0.2,

        reason:
          "Insufficient content"

      }

    }


    return {

      verified:true,

      confidence:
        source.confidence,

      reason:
        "Source passed validation"

    }


  }


}
