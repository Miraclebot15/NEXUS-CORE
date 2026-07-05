'use client'

import { motion } from 'framer-motion'
import { Brain, CheckCircle2, FileOutput, Flag, LogIn, Shield, Wand2, Zap } from 'lucide-react'
import type { OrchestrationKind, StepVerdict } from '@/lib/orchestration'
import { VERDICT_META } from '@/lib/orchestration'
import { cn } from '@/lib/utils'

const KIND_ICONS: Record<OrchestrationKind, typeof Brain> = {
  intake: LogIn,
  reasoning: Brain,
  governance: Shield,
  correction: Wand2,
  execution: Zap,
  artifact: FileOutput,
  terminal: Flag,
}

export function ActionIndicator({
  kind,
  label,
  verdict,
  isCurrent,
}: {
  kind: OrchestrationKind
  label: string
  verdict: StepVerdict
  isCurrent: boolean
}) {
  const Icon = KIND_ICONS[kind]
  const meta = VERDICT_META[verdict]

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium',
        isCurrent
          ? cn('border-border glass', meta.textClass)
          : 'border-border/50 text-muted-foreground/70 opacity-70',
      )}
    >
      <span className="relative flex size-4 items-center justify-center">
        {isCurrent ? (
          <>
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0"
            >
              <Icon className="size-4" />
            </motion.span>
            <motion.span
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className={cn('absolute inset-0 rounded-full opacity-25', meta.ringClass)}
            />
          </>
        ) : (
          <CheckCircle2 className="size-4" />
        )}
      </span>
      <span className="text-sm">{label}</span>
    </motion.div>
  )
}
