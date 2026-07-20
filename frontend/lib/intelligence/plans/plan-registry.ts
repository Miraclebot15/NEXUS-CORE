import type {
  AIPlan,
} from "./types"


export const AI_PLANS:
Record<string,AIPlan> = {


  free:{

    id:"free",

    name:"Free",

    dailyTokens:10000,

    monthlyTokens:100000,

    imageGenerations:2,

    uploads:1,

    maxModelTier:"cheap"

  },


  starter:{

    id:"starter",

    name:"Starter",

    dailyTokens:50000,

    monthlyTokens:500000,

    imageGenerations:20,

    uploads:10,

    maxModelTier:"balanced"

  },


  pro:{

    id:"pro",

    name:"Pro",

    dailyTokens:200000,

    monthlyTokens:2000000,

    imageGenerations:100,

    uploads:50,

    maxModelTier:"flagship"

  },


  enterprise:{

    id:"enterprise",

    name:"Enterprise",

    dailyTokens:1000000,

    monthlyTokens:10000000,

    imageGenerations:1000,

    uploads:500,

    maxModelTier:"flagship"

  }


}
