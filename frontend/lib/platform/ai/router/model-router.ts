import {
  PlatformService,
} from "../../services"


export interface ModelRoute{

  provider:string

  model:string

}


export class ModelRouter{


  constructor(
    private readonly platform:
      PlatformService
  ){}



  resolve(
    requestedProvider?:string
  ):ModelRoute{


    const providers =
      this.platform.providers
        .all()


    if(requestedProvider){

      const provider =
        this.platform.providers
          .get(requestedProvider)


      if(
        !provider ||
        !provider.isConfigured()
      ){

        throw new Error(
          `Provider unavailable: ${requestedProvider}`
        )

      }


      return {

        provider:
          provider.id,

        model:
          "default",

      }

    }



    const available =
      providers.find(
        provider =>
          provider.isConfigured()
      )


    if(!available){

      throw new Error(
        "No AI provider available"
      )

    }



    return {

      provider:
        available.id,

      model:
        "default",

    }


  }


}
