/**
 * NEXUS CORE :: nexus-mark.tsx
 *
 * The product's real brand mark. Replaces a previous placeholder that
 * rendered a literal letter "Q" filled with a pink/blue/cyan gradient --
 * that glyph had nothing to do with either NEXUS CORE or Qwen's own brand,
 * and reproducing Alibaba's actual Qwen logo isn't something to do without
 * rights to that mark anyway.
 *
 * This mark is three linked segments -- a direct reference to the product's
 * real signature mechanic: a hash-chained, tamper-evident audit log. Solid
 * single-color stroke, no gradient fill.
 */

import { cn } from '@/lib/utils'

export function NexusMark({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <rect x="3" y="4" width="9" height="9" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <rect x="20" y="19" width="9" height="9" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="16" r="3.2" fill="currentColor" />
      <path
        d="M11 9.5 L14 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M18.2 18 L21 22.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
