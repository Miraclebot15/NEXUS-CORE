import{
  SystemPrompt,
} from "./system-prompt"

import{
  PersonalityPrompt,
} from "./personality-prompt"

import{
  MemoryPrompt,
} from "./memory-prompt"

import{
  ContextPrompt,
} from "./context-prompt"

import type{
  PromptBuildContext,
  BuiltPrompt,
} from "./types"

export class PromptBuilder{

  private readonly system=
    new SystemPrompt()

  private readonly personality=
    new PersonalityPrompt()

  private readonly memory=
    new MemoryPrompt()

  private readonly context=
    new ContextPrompt()

  build(
    input:PromptBuildContext
  ):BuiltPrompt{

    const systemPrompt=[

      this.system.build(),

      this.personality.build(
        input.personality
      ),

      this.memory.build(
        input.memories
      ),

      this.context.build(
        input.context
      )

    ]
    .filter(Boolean)
    .join("\n\n")

    return{

      system:
        systemPrompt,

      messages:[

        {

          role:"user",

          content:
            input.userInput

        }

      ],

      estimatedTokens:
        Math.ceil(
          systemPrompt.length/4
        )

    }

  }

}
