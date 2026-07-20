import type{
  IntelligenceCapability,
  CapabilityContext,
  CapabilityResult,
} from "./types"

export class CapabilityManager{

  private readonly capabilities =
    new Map<
      string,
      IntelligenceCapability
    >()

  register(
    capability:IntelligenceCapability
  ){

    this.capabilities.set(
      capability.id,
      capability
    )

  }

  get(
    id:string
  ){

    return this.capabilities.get(id)

  }

  list(){

    return [
      ...this.capabilities.values()
    ]

  }

  async execute(

    id:string,

    context:CapabilityContext

  ):Promise<CapabilityResult>{

    const capability =
      this.capabilities.get(id)

    if(!capability){

      throw new Error(
        `Capability ${id} not registered`
      )

    }

    return capability.execute(
      context
    )

  }

}
