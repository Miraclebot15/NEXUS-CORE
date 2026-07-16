import {
  SubscriptionManager,
} from "@/lib/platform/billing/subscriptions/subscription-manager"

import {
  getFeatureLimits,
} from "@/lib/platform/billing/limits/feature-limits"

import {
  Feature,
} from "../types/entitlements"



export class EntitlementEngine{

  constructor(

    private readonly subscriptions:
      SubscriptionManager

  ){}



  hasFeature(

    userId:string,

    feature:Feature

  ){

    const subscription =
      this.subscriptions.get(
        userId
      )

    if(!subscription){
      return false
    }

    const limits =
      getFeatureLimits(
        subscription.plan
      )

    switch(feature){

      case Feature.WEB_SEARCH:
        return limits.webSearch

      case Feature.DEEP_RESEARCH:
        return limits.deepResearch

      case Feature.REASONING:
        return limits.reasoning

      case Feature.IMAGE_GENERATION:
        return limits.imageGeneration

      case Feature.VIDEO_GENERATION:
        return limits.videoGeneration

      case Feature.VOICE_CHAT:
      case Feature.LIVE_VOICE:
        return limits.voice

      case Feature.GMAIL:
      case Feature.DRIVE:
      case Feature.DOCS:
      case Feature.SHEETS:
      case Feature.SLIDES:
      case Feature.CALENDAR:
        return limits.googleWorkspace

      case Feature.GITHUB:
        return limits.github

      case Feature.WORKFLOWS:
        return limits.automation

      case Feature.LONG_MEMORY:
        return limits.memory

      default:
        return false

    }

  }

}
