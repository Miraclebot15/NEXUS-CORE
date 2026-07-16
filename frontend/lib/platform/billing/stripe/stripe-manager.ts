import {
  STRIPE_PRICE_IDS,
} from "./price-registry"

import type {
  BillingInterval,
  BillingPlanId,
} from "../types/billing"



export class StripeManager{

  readonly id="stripe"



  constructor(

    protected readonly secretKey:string,

    protected readonly publishableKey:string

  ){}



  isConfigured(){

    return Boolean(

      this.secretKey &&
      this.publishableKey

    )

  }



  getPublishableKey(){

    return this.publishableKey

  }



  getPriceId(

    plan:BillingPlanId,

    interval:BillingInterval

  ){

    return STRIPE_PRICE_IDS[
      plan
    ][interval]

  }



  async createCustomer(

    email:string,

    name?:string

  ){

    return{

      provider:"stripe",

      email,

      name,

      status:"pending"

    }

  }



  async createCheckoutSession(

    plan:BillingPlanId,

    interval:BillingInterval,

    customerId:string

  ){

    return{

      provider:"stripe",

      customerId,

      priceId:this.getPriceId(

        plan,

        interval

      ),

      checkoutUrl:null,

    }

  }



  async createBillingPortal(

    customerId:string

  ){

    return{

      provider:"stripe",

      customerId,

      portalUrl:null,

    }

  }



  async cancelSubscription(

    subscriptionId:string

  ){

    return{

      provider:"stripe",

      subscriptionId,

      cancelled:false,

    }

  }



  async handleWebhook(

    payload:unknown

  ){

    return{

      processed:false,

      payload,

    }

  }

}
