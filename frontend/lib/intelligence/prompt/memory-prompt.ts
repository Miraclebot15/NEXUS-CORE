import type{
  RetrievedMemory,
} from "../memory"

export class MemoryPrompt{

  build(
    memories?:RetrievedMemory[]
  ){

    if(

      !memories ||

      memories.length===0

    ){

      return ""

    }

    const lines=

      memories

      .sort(

        (a,b)=>

          b.score-a.score

      )

      .slice(
        0,
        15
      )

      .map(

        item=>{

          const memory=
            item.memory

          return [

            "-",

            `[${memory.type}]`,

            memory.content

          ].join(" ")

        }

      )

    return [

      "Relevant Memory",

      "",

      ...lines

    ].join("\n")

  }

}
