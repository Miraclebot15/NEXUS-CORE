import {
  Feature,
} from "../types/entitlements"


export const FeatureCatalog = {

  [Feature.WEB_SEARCH]: {
    name:"Web Search",
    description:"Search the web for current information",
  },

  [Feature.DEEP_RESEARCH]: {
    name:"Deep Research",
    description:"Advanced research workflows",
  },

  [Feature.REASONING]: {
    name:"Reasoning",
    description:"Advanced reasoning models",
  },

  [Feature.IMAGE_GENERATION]: {
    name:"Image Generation",
    description:"Generate images",
  },

  [Feature.VIDEO_GENERATION]: {
    name:"Video Generation",
    description:"Generate videos",
  },

  [Feature.VOICE_CHAT]: {
    name:"Voice Chat",
    description:"Voice conversations",
  },

  [Feature.LONG_MEMORY]: {
    name:"Long Memory",
    description:"Persistent memory",
  },

} as const
