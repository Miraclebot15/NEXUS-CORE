import type{
  CapabilityContext,
  CapabilityResult,
  IntelligenceCapability,
} from "./types"

import{
  QwenProvider,
} from "../providers"

export class QwenCapability
implements IntelligenceCapability{

  readonly id="qwen"

  readonly name="Alibaba Qwen"

  constructor(

    private readonly provider=
      new QwenProvider()

  ){}

  async execute(

    context:CapabilityContext

  ):Promise<CapabilityResult>{

    const response =
      await this.provider.execute({

        model:
          context.model,

        input:
          context.input,

        userId:
          context.userId,

        conversationId:
          context.conversationId,

        metadata:
          context.metadata

      })

    return{

      success:true,

      output:
        response.output,

      tokensUsed:
        response.tokensUsed,

      model:
        response.model

    }

  }

}
