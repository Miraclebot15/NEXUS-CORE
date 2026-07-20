export class ContextPrompt{

  build(
    context?:Record<
      string,
      unknown
    >
  ){

    if(

      !context ||

      Object.keys(
        context
      ).length===0

    ){

      return ""

    }

    const lines=

      Object.entries(
        context
      )

      .map(

        ([key,value])=>{

          if(

            value===undefined ||

            value===null

          ){

            return null

          }

          const formatted=

            typeof value==="object"

            ? JSON.stringify(
                value,
                null,
                2
              )

            : String(
                value
              )

          return `${key}: ${formatted}`

        }

      )

      .filter(

        Boolean

      ) as string[]

    if(

      lines.length===0

    ){

      return ""

    }

    return [

      "Runtime Context",

      "",

      ...lines

    ].join("\n")

  }

}
