import {
  FeatureFlag,
} from "./feature-flags"

export const LaunchFlags={

  [FeatureFlag.BILLING]:true,

  [FeatureFlag.STRIPE]:true,

  [FeatureFlag.TRIALS]:true,

  [FeatureFlag.WEB_SEARCH]:true,

  [FeatureFlag.IMAGE_GENERATION]:true,

  [FeatureFlag.VIDEO_GENERATION]:true,

  [FeatureFlag.VOICE]:true,

  [FeatureFlag.MEMORY]:true,

  [FeatureFlag.AUTOMATION]:true,

  [FeatureFlag.GOOGLE_WORKSPACE]:true,

} as const
