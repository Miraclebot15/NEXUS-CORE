import {
  TrialManager,
} from "../billing/state/trial-manager"

export function buildTrialManager(){

  const launchDate = Number(
    process.env.NEXT_PUBLIC_LAUNCH_DATE ??
    "0"
  )

  return new TrialManager(
    launchDate,
    7,
    7
  )

}
