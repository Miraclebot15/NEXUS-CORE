import type {
  ModelSelection,
} from "./types"



export class ModelSelector{


  select(
    capability:string,
    complexity:
      "low" |
      "medium" |
      "high"
  ):ModelSelection{


    if(
      capability === "coding"
    ){

      if(
        complexity === "high"
      ){

        return {

          capability,

          tier:"flagship",

          model:
            process.env.QWEN_CODER_480B_MODEL
            ??
            "qwen-coder-480b"

        }

      }


      if(
        complexity === "medium"
      ){

        return {

          capability,

          tier:"balanced",

          model:
            process.env.QWEN_CODER_MODEL
            ??
            "qwen-coder-plus"

        }

      }


      return {

        capability,

        tier:"cheap",

        model:
          process.env.QWEN_FAST_MODEL
          ??
          "qwen-flash"

      }

    }



    return {

      capability,

      tier:"balanced",

      model:
        process.env.QWEN_MODEL
        ??
        "qwen-default"

    }


  }

}
