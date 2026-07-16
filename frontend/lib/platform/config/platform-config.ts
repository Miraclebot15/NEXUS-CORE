import {
  LaunchFlags,
} from "../flags/launch-flags"

export const PlatformConfig={

  appName:"NEXUS",

  launchDate:Number(
    process.env.NEXT_PUBLIC_LAUNCH_DATE ??
    "0"
  ),

  trialDays:7,

  launchWindowDays:7,

  flags:LaunchFlags,

}
