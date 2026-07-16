export const STRIPE_PRICE_IDS = {

  basic:{

    monthly:
      process.env.STRIPE_BASIC_MONTHLY_PRICE_ID ?? "",

    yearly:
      process.env.STRIPE_BASIC_YEARLY_PRICE_ID ?? "",

  },

  pro:{

    monthly:
      process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? "",

    yearly:
      process.env.STRIPE_PRO_YEARLY_PRICE_ID ?? "",

  },

  creator:{

    monthly:
      process.env.STRIPE_CREATOR_MONTHLY_PRICE_ID ?? "",

    yearly:
      process.env.STRIPE_CREATOR_YEARLY_PRICE_ID ?? "",

  },

  team:{

    monthly:
      process.env.STRIPE_TEAM_MONTHLY_PRICE_ID ?? "",

    yearly:
      process.env.STRIPE_TEAM_YEARLY_PRICE_ID ?? "",

  },

  business:{

    monthly:
      process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID ?? "",

    yearly:
      process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID ?? "",

  },

  enterprise:{

    monthly:
      process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID ?? "",

    yearly:
      process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID ?? "",

  },

} as const
