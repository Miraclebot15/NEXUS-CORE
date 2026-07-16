import type {
  Capability,
} from "./types"


export class CapabilityRegistry {

  private readonly capabilities =
    new Map<string, Capability>()


  register(
    capability: Capability
  ): void {

    if(
      this.capabilities.has(
        capability.id
      )
    ){
      throw new Error(
        `Capability ${capability.id} already exists`
      )
    }

    this.capabilities.set(
      capability.id,
      capability
    )
  }


  unregister(
    id:string
  ):void{

    this.capabilities.delete(id)

  }


  get(
    id:string
  ):Capability | undefined{

    return this.capabilities.get(id)

  }


  list():Capability[]{

    return [
      ...this.capabilities.values()
    ]

  }

}
