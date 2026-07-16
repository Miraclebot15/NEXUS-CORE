export class TrialManager{

  constructor(

    private readonly launchDate:number,

    private readonly launchWindowDays=7,

    private readonly trialDays=7

  ){}

  private day=
    24*60*60*1000

  canStartTrial(){

    return (
      Date.now() <
      this.launchDate +
      this.launchWindowDays*this.day
    )

  }

  getTrialEnd(){

    return (
      Date.now() +
      this.trialDays*this.day
    )

  }

  getLaunchWindowEnd(){

    return (
      this.launchDate +
      this.launchWindowDays*this.day
    )

  }

}
