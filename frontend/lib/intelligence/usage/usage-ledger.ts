import type {
  UsageTransaction,
} from "./types"



export class UsageLedger{


  private transactions:
    UsageTransaction[] = []



  record(
    transaction:UsageTransaction
  ){

    this.transactions.push(
      transaction
    )

  }



  history(
    userId:string
  ){

    return this.transactions.filter(
      item =>
        item.userId === userId
    )

  }



  totalUsed(
    userId:string,
    type:UsageTransaction["type"]
  ){

    return this.transactions
      .filter(
        item =>
          item.userId === userId &&
          item.type === type
      )
      .reduce(
        (sum,item)=>
          sum + item.amount,
        0
      )

  }


}
