'use client'

import { useEffect, useRef } from 'react'

/**
 * Ambient backdrop: a faint schematic grid (a control-room/blueprint motif)
 * plus a restrained cursor-reactive spotlight and vignette.
 *
 * This previously rendered three large, blurred, drifting color blobs
 * ("mesh gradient" blobs) in primary/accent hues -- a very recognizable
 * default-AI-generated-UI look. Replaced with a single monochrome grid
 * texture and one single-hue spotlight, which reads as an instrument panel
 * rather than a marketing hero background.
 */
export function AmbientBackground() {
  const glowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = glowRef.current
    if (!el) return

    const fine = window.matchMedia('(pointer: fine)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || reduced) return

    let frame = 0
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        el.style.setProperty('--mx', `${e.clientX}px`)
        el.style.setProperty('--my', `${e.clientY}px`)
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base wash */}
      <div className="absolute inset-0 bg-background" />

      {/* Faint drifting schematic grid */}
      <div className="schematic-grid animate-grid-drift absolute inset-0 opacity-60" />

      {/* Single-hue cursor spotlight (a radial vignette, not a multi-hue gradient) */}
      <div
        ref={glowRef}
        className="absolute inset-0 opacity-60 transition-opacity duration-500"
        style={{
          background:
            'radial-gradient(600px circle at var(--mx, 50%) var(--my, 30%), color-mix(in oklch, var(--primary) 9%, transparent), transparent 60%)',
        }}
      />

      {/* Edge vignette for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,oklch(0.1_0.01_264/0.6)_100%)]" />

      {/* Fine grain texture */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  )
}
