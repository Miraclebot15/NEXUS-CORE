export interface UsageRecord{

  requests:number

  imageGenerations:number

  videoGenerations:number

  liveVoiceMinutes:number

  deepResearchRuns:number

  webSearches:number

  automationRuns:number

}



export class UsageTracker{

  private readonly usage=
    new Map<string,UsageRecord>()


  private ensure(
    userId:string
  ){

    if(
      !this.usage.has(userId)
    ){

      this.usage.set(userId,{

        requests:0,

        imageGenerations:0,

        videoGenerations:0,

        liveVoiceMinutes:0,

        deepResearchRuns:0,

        webSearches:0,

        automationRuns:0,

      })

    }


    return this.usage.get(
      userId
    )!

  }



  increment(

    userId:string,

    field:keyof UsageRecord,

    amount=1

  ){

    const usage=
      this.ensure(userId)

    usage[field]+=amount

  }



  get(
    userId:string
  ){

    return this.ensure(userId)

  }



  reset(
    userId:string
  ){

    this.usage.delete(
      userId
    )

  }

}
