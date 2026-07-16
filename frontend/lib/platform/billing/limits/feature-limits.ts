import type {
  BillingPlanId,
} from "../types/billing"


export interface FeatureLimits {

  webSearch:boolean

  deepResearch:boolean

  reasoning:boolean

  imageGeneration:boolean

  videoGeneration:boolean

  voice:boolean

  googleWorkspace:boolean

  github:boolean

  automation:boolean

  memory:boolean

  maxDailyMessages:number

}


export const FEATURE_LIMITS:
Record<
  BillingPlanId,
  FeatureLimits
> = {

  basic:{

    webSearch:true,

    deepResearch:false,

    reasoning:false,

    imageGeneration:true,

    videoGeneration:false,

    voice:false,

    googleWorkspace:false,

    github:false,

    automation:false,

    memory:true,

    maxDailyMessages:150

  },


  pro:{

    webSearch:true,

    deepResearch:true,

    reasoning:true,

    imageGeneration:true,

    videoGeneration:false,

    voice:true,

    googleWorkspace:true,

    github:true,

    automation:false,

    memory:true,

    maxDailyMessages:1000

  },


  creator:{

    webSearch:true,

    deepResearch:true,

    reasoning:true,

    imageGeneration:true,

    videoGeneration:true,

    voice:true,

    googleWorkspace:true,

    github:true,

    automation:true,

    memory:true,

    maxDailyMessages:3000

  },


  team:{

    webSearch:true,

    deepResearch:true,

    reasoning:true,

    imageGeneration:true,

    videoGeneration:true,

    voice:true,

    googleWorkspace:true,

    github:true,

    automation:true,

    memory:true,

    maxDailyMessages:10000

  },


  business:{

    webSearch:true,

    deepResearch:true,

    reasoning:true,

    imageGeneration:true,

    videoGeneration:true,

    voice:true,

    googleWorkspace:true,

    github:true,

    automation:true,

    memory:true,

    maxDailyMessages:50000

  },


  enterprise:{

    webSearch:true,

    deepResearch:true,

    reasoning:true,

    imageGeneration:true,

    videoGeneration:true,

    voice:true,

    googleWorkspace:true,

    github:true,

    automation:true,

    memory:true,

    maxDailyMessages:Number.MAX_SAFE_INTEGER

  }

}


export function getFeatureLimits(
  plan:BillingPlanId
){

  return FEATURE_LIMITS[plan]

}
