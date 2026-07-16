import type {
  BillingPlan,
  BillingPlanId,
} from "../types/billing"


export const BILLING_PLANS:
Record<
  BillingPlanId,
  BillingPlan
> = {

  basic:{

    id:"basic",

    name:"Basic",

    monthlyPrice:7,

    yearlyPrice:70,

    description:
      "Entry level AI features"

  },


  pro:{

    id:"pro",

    name:"Pro",

    monthlyPrice:20,

    yearlyPrice:200,

    description:
      "Advanced reasoning and productivity"

  },


  creator:{

    id:"creator",

    name:"Creator",

    monthlyPrice:50,

    yearlyPrice:500,

    description:
      "Content creation and media tools"

  },


  team:{

    id:"team",

    name:"Team",

    monthlyPrice:100,

    yearlyPrice:1000,

    description:
      "Small teams and collaboration"

  },


  business:{

    id:"business",

    name:"Business",

    monthlyPrice:200,

    yearlyPrice:2000,

    description:
      "Business automation"

  },


  enterprise:{

    id:"enterprise",

    name:"Enterprise",

    monthlyPrice:400,

    yearlyPrice:4000,

    description:
      "Unlimited enterprise platform"

  }

}


export function getBillingPlan(
  id:BillingPlanId
){

  return BILLING_PLANS[id]

}


export function getAllPlans(){

  return Object.values(
    BILLING_PLANS
  )

}
