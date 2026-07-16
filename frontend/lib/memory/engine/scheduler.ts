import type {
  ContextBuilder,
} from "./builders/types"


export function sortBuilders(
  builders: ContextBuilder[]
){

  return [...builders].sort(

    (a,b) =>
      b.priority -
      a.priority

  )

}


export function splitBuilders(
  builders: ContextBuilder[]
){

  return {

    parallel:
      builders.filter(
        b => b.parallel
      ),


    sequential:
      builders.filter(
        b => !b.parallel
      )

  }

}
