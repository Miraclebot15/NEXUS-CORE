export interface UsageQuota{

  dailyTokens:number

  monthlyTokens:number

  imageGenerations:number

  uploads:number

}


export interface UsageState{

  usedDailyTokens:number

  usedMonthlyTokens:number

  usedImages:number

  usedUploads:number

  lastDailyReset:number

  lastMonthlyReset:number

}
