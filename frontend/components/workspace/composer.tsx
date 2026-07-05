'use client'

import { useRef, useState } from 'react'
import {
  ArrowUp,
  Brain,
  Cpu,
  FileText,
  Lightbulb,
  Microscope,
  Zap,
  Image as ImageIcon,
  Mic,
  Plus,
  Search,
  Square,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { QWEN_MODELS } from '@/lib/models'
import { Menu, type MenuSection } from './menu'

type ReasoningMode = 'standard' | 'deep-research' | 'thinking' | 'brainstorming' | 'learning'

/** Real (if simple) hints prepended to the prompt ELLA receives -- not a
 *  cosmetic tag. Each one nudges the actual model's behavior. */
const REASONING_PREFIXES: Record<ReasoningMode, string> = {
  standard: '',
  'deep-research': 'Research this thoroughly using web search and cite sources where relevant. ',
  thinking: 'Think through this step by step before proposing a plan. ',
  brainstorming: 'Brainstorm multiple distinct options before settling on a plan. ',
  learning: 'Explain your reasoning in an educational, step-by-step way. ',
}

const REASONING_MODES: Record<
  ReasoningMode,
  { label: string; description: string; icon: typeof Brain }
> = {
  standard: { label: 'Standard', description: 'Fast, direct responses', icon: Zap },
  'deep-research': {
    label: 'Deep Research',
    description: 'Uses the real web_search tool, with sources',
    icon: Microscope,
  },
  thinking: { label: 'Thinking', description: 'Extended reasoning process', icon: Brain },
  brainstorming: { label: 'Brainstorming', description: 'Creative exploration', icon: Lightbulb },
  learning: { label: 'Learning', description: 'Educational deep dive', icon: Cpu },
}

export function Composer({
  onSend,
  onStop,
  onOpenSearch,
  isBusy,
  reasoningMode,
  onSelectReasoningMode,
  selectedModel,
  onSelectModel,
}: {
  onSend: (text: string) => void
  onStop: () => void
  onOpenSearch: () => void
  isBusy: boolean
  reasoningMode: ReasoningMode
  onSelectReasoningMode: (mode: ReasoningMode) => void
  selectedModel: string
  onSelectModel: (model: string) => void
}) {
  const [value, setValue] = useState('')
  const taRef = useRef<HTMLTextAreaElement>(null)

  const grow = () => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
  }

  const submit = () => {
    const text = value.trim()
    if (!text || isBusy) return
    onSend(`${REASONING_PREFIXES[reasoningMode]}${text}`)
    setValue('')
    requestAnimationFrame(() => {
      if (taRef.current) taRef.current.style.height = 'auto'
    })
  }

  const attachSections: MenuSection[] = [
    {
      id: 'files',
      label: 'Add Files & Media',
      items: [
        {
          id: 'upload',
          label: 'Upload from device',
          description: 'Not yet supported by the backend',
          icon: Upload,
          disabled: true,
          onSelect: () => {},
        },
        {
          id: 'image',
          label: 'Add image',
          description: 'Not yet supported by the backend',
          icon: ImageIcon,
          disabled: true,
          onSelect: () => {},
        },
        {
          id: 'doc',
          label: 'Attach document',
          description: 'Not yet supported by the backend',
          icon: FileText,
          disabled: true,
          onSelect: () => {},
        },
      ],
    },
    {
      id: 'reasoning',
      label: 'Reasoning Mode',
      items: Object.entries(REASONING_MODES).map(([key, meta]) => ({
        id: key,
        label: meta.label,
        description: meta.description,
        icon: meta.icon,
        selected: key === reasoningMode,
        onSelect: () => onSelectReasoningMode(key as ReasoningMode),
      })),
    },
    {
      id: 'model',
      label: 'AI Model',
      items: QWEN_MODELS.map((m) => ({
        id: m.id,
        label: m.label,
        description: m.description,
        icon: Cpu,
        selected: m.id === selectedModel,
        onSelect: () => onSelectModel(m.id),
      })),
    },
  ]

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Respect IME composition (CJK) before submitting on Enter.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="glass-strong rounded-2xl border border-border/50 p-3 shadow-xl shadow-black/20 transition-all duration-200 focus-within:border-primary/40 focus-within:shadow-2xl focus-within:shadow-primary/10">
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            grow()
          }}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="What would you like NEXUS CORE to orchestrate?"
          className="max-h-[200px] w-full resize-none bg-transparent px-4 py-3 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/60"
        />

        <div className="mt-2 flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-0.5">
            <Menu
              align="start"
              side="top"
              ariaLabel="Attach"
              sections={attachSections}
              trigger={({ ref, onClick, open, ...aria }) => (
                <button
                  ref={ref}
                  type="button"
                  onClick={onClick}
                  {...aria}
                  title="Attach files, images, or documents"
                  className={cn(
                    'flex items-center justify-center rounded-lg p-2 transition-all duration-150',
                    open
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground',
                  )}
                >
                  <Plus className="size-5" />
                </button>
              )}
            />
            <Menu
              align="start"
              side="top"
              ariaLabel="Select reasoning mode"
              sections={attachSections.slice(1, 2)}
              trigger={({ ref, onClick, open, ...aria }) => {
                const reasoningMeta = REASONING_MODES[reasoningMode]
                const ReasoningIcon = reasoningMeta.icon
                return (
                  <button
                    ref={ref}
                    type="button"
                    onClick={onClick}
                    {...aria}
                    title={`Reasoning mode: ${reasoningMeta.label}`}
                    className={cn(
                      'flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-all duration-150',
                      open || reasoningMode !== 'standard'
                        ? 'bg-primary/20 text-primary'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <ReasoningIcon className="size-4" />
                    <span className="hidden sm:inline">{reasoningMeta.label}</span>
                  </button>
                )
              }}
            />
            <button
              type="button"
              onClick={onOpenSearch}
              title="Search memory"
              className="hidden items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground sm:flex"
            >
              <Search className="size-5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled
              title="Voice input (not yet supported by the backend)"
              className="flex items-center justify-center rounded-lg p-2 text-muted-foreground/40 transition-colors"
            >
              <Mic className="size-5" />
            </button>
            {isBusy ? (
              <button
                type="button"
                onClick={onStop}
                title="Stop generation"
                className="flex size-8 items-center justify-center rounded-lg bg-secondary/80 text-foreground transition-all hover:bg-secondary"
              >
                <Square className="size-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={!value.trim()}
                title="Send message (Enter)"
                className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all enabled:hover:brightness-110 disabled:opacity-30"
              >
                <ArrowUp className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
