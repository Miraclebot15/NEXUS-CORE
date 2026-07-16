import {
  getPlatform,
} from "../get-platform"


export class PlatformService{


  private get platform(){
    return getPlatform()
  }


  get billing(){
    return this.platform.billing
  }


  get subscriptions(){
    return this.platform.billing.subscriptions
  }


  get usage(){
    return this.platform.billing.usage
  }


  get entitlements(){
    return this.platform.entitlements
  }


  get providers(){
    return this.platform.providers
  }


  get guard(){
    return this.platform.guard
  }


  get trial(){
    return this.platform.trial
  }

}
