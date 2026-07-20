import type {
  UsageQuota,
  UsageState,
} from "./types"


export class QuotaManager{


  constructor(
    private readonly quota:UsageQuota
  ){}



  canUseChat(
    state:UsageState,
    tokens:number
  ){

    return (
      state.usedDailyTokens + tokens
      <=
      this.quota.dailyTokens
    )

  }



  canGenerateImage(
    state:UsageState
  ){

    return (
      state.usedImages
      <
      this.quota.imageGenerations
    )

  }



  canUpload(
    state:UsageState
  ){

    return (
      state.usedUploads
      <
      this.quota.uploads
    )

  }


}
