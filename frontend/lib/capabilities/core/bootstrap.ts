import {
  NexusRuntime,
} from "./runtime"


import {
  HealthCheckCapability,
} from "../system/health-check"



export async function bootstrapNexus(){

  const runtime =
    new NexusRuntime()


  await runtime.capabilityManager.install(
    new HealthCheckCapability()
  )


  return runtime

}
