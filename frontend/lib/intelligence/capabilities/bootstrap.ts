import{
  CapabilityManager,
} from "./capability-manager"

import{
  QwenCapability,
} from "./qwen-capability"

export function createCapabilityManager(){

  const manager =
    new CapabilityManager()

  manager.register(
    new QwenCapability()
  )

  return manager

}
