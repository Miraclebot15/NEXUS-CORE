'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { Timeline } from '@/lib/orchestration'
import { ActionIndicator } from './action-indicator'

/** A strip of chips for the most recent orchestration steps, animating in
 *  as real events arrive off the SSE stream (no simulated timing). */
export function OrchestrationActions({
  timeline,
  isActive,
}: {
  timeline: Timeline
  isActive: boolean
}) {
  if (!isActive || timeline.events.length === 0) return null

  const visible = timeline.events.slice(-3)
  const lastId = timeline.events[timeline.events.length - 1]?.id

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.3 }}
      className="mb-2 flex flex-wrap items-center gap-1.5"
    >
      <AnimatePresence mode="popLayout">
        {visible.map((event) => (
          <motion.div key={event.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
            <ActionIndicator
              kind={event.kind}
              label={event.label}
              verdict={event.verdict}
              isCurrent={event.id === lastId}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
