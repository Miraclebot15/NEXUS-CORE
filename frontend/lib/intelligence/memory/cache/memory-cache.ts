import type{
  RetrievedMemory,
} from "../types"

export class MemoryCache{

  private readonly cache =
    new Map<
      string,
      RetrievedMemory[]
    >()

  get(
    key:string
  ){
    return this.cache.get(
      key
    )
  }

  set(
    key:string,
    memories:RetrievedMemory[]
  ){
    this.cache.set(
      key,
      memories
    )
  }

  invalidate(
    key?:string
  ){

    if(
      key
    ){

      this.cache.delete(
        key
      )

      return

    }

    this.cache.clear()

  }

}
