import { ProviderRegistry } from "../providers/provider-registry"

import { StripeProvider } from "../billing/stripe/stripe-provider"

export function buildProviderRegistry(){

  const registry =
    new ProviderRegistry()

  registry.register(

    new StripeProvider(

      process.env.STRIPE_SECRET_KEY ?? "",

      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""

    )

  )

  return registry

}
