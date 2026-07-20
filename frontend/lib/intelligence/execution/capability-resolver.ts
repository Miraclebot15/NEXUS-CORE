import {
  CapabilityRegistry,
} from "@/lib/capabilities/registry"


export class CapabilityResolver{


  constructor(
    private readonly registry:
      CapabilityRegistry
  ){}



  resolve(
    capabilityId:string
  ){

    const capability =
      this.registry.get(
        capabilityId
      )


    if(!capability){

      throw new Error(
        `Capability unavailable: ${capabilityId}`
      )

    }


    return capability

  }


}
