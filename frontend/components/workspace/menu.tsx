'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type MenuItem = {
  id: string
  label: string
  description?: string
  icon?: LucideIcon
  selected?: boolean
  disabled?: boolean
  danger?: boolean
  onSelect: () => void
}

export type MenuSection = {
  id: string
  label?: string
  items: MenuItem[]
}

type Placement = 'top' | 'bottom'
type Align = 'start' | 'end'

const MENU_GAP = 8
const VIEWPORT_MARGIN = 12

/**
 * Cinematic, accessible dropdown / drop-up menu.
 * - Auto-flips above or below the trigger based on available space.
 * - Rendered in a portal with fixed positioning so it never clips inside
 *   overflow-hidden headers or composers.
 * - Fully responsive: clamps to the viewport on small screens.
 * - Keyboard: Escape closes, Arrow Up/Down move, Enter/Space select.
 */
export function Menu({
  trigger,
  sections,
  align = 'start',
  side = 'auto',
  menuClassName,
  ariaLabel,
}: {
  trigger: (props: {
    open: boolean
    ref: (node: HTMLButtonElement | null) => void
    onClick: () => void
    'aria-haspopup': 'menu'
    'aria-expanded': boolean
  }) => ReactNode
  sections: MenuSection[]
  align?: Align
  side?: Placement | 'auto'
  menuClassName?: string
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [coords, setCoords] = useState<{
    left: number
    top: number
    placement: Placement
    minWidth: number
  } | null>(null)
  const [activeIndex, setActiveIndex] = useState(-1)

  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const flatItems = sections.flatMap((s) => s.items)

  useEffect(() => setMounted(true), [])

  const position = useCallback(() => {
    const trig = triggerRef.current
    if (!trig) return
    const rect = trig.getBoundingClientRect()
    const menuH = menuRef.current?.offsetHeight ?? 0
    const menuW = menuRef.current?.offsetWidth ?? rect.width

    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const placement: Placement =
      side === 'auto'
        ? spaceBelow < menuH + MENU_GAP + VIEWPORT_MARGIN &&
          spaceAbove > spaceBelow
          ? 'top'
          : 'bottom'
        : side

    let left = align === 'end' ? rect.right - menuW : rect.left
    left = Math.min(
      Math.max(VIEWPORT_MARGIN, left),
      window.innerWidth - menuW - VIEWPORT_MARGIN,
    )

    const top =
      placement === 'bottom'
        ? rect.bottom + MENU_GAP
        : rect.top - menuH - MENU_GAP

    setCoords({ left, top, placement, minWidth: rect.width })
  }, [align, side])

  // Recompute position once the menu has rendered (so we know its size).
  useLayoutEffect(() => {
    if (open) position()
  }, [open, position])

  useEffect(() => {
    if (!open) return
    const handle = () => position()
    window.addEventListener('resize', handle)
    window.addEventListener('scroll', handle, true)
    return () => {
      window.removeEventListener('resize', handle)
      window.removeEventListener('scroll', handle, true)
    }
  }, [open, position])

  // Click outside + Escape + keyboard nav.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (
        !menuRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => nextEnabled(flatItems, i, 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => nextEnabled(flatItems, i, -1))
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (activeIndex >= 0 && flatItems[activeIndex]) {
          e.preventDefault()
          select(flatItems[activeIndex])
        }
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeIndex, flatItems])

  const select = (item: MenuItem) => {
    if (item.disabled) return
    item.onSelect()
    setOpen(false)
    triggerRef.current?.focus()
  }

  const toggle = () => {
    setActiveIndex(flatItems.findIndex((i) => i.selected))
    setOpen((o) => !o)
  }

  let renderIndex = -1

  return (
    <>
      {trigger({
        open,
        ref: (node) => {
          triggerRef.current = node
        },
        onClick: toggle,
        'aria-haspopup': 'menu',
        'aria-expanded': open,
      })}

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={menuRef}
                role="menu"
                aria-label={ariaLabel}
                initial={{
                  opacity: 0,
                  y: coords?.placement === 'top' ? 6 : -6,
                  scale: 0.97,
                }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{
                  opacity: 0,
                  y: coords?.placement === 'top' ? 6 : -6,
                  scale: 0.97,
                }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: 'fixed',
                  left: coords?.left ?? -9999,
                  top: coords?.top ?? -9999,
                  minWidth: Math.max(coords?.minWidth ?? 0, 224),
                  transformOrigin:
                    coords?.placement === 'top' ? 'bottom' : 'top',
                }}
                className={cn(
                  'z-[100] max-h-[70vh] overflow-y-auto rounded-2xl border border-border p-1.5',
                  'glass-strong shadow-2xl shadow-black/60',
                  menuClassName,
                )}
              >
                {sections.map((section, si) => (
                  <div key={section.id}>
                    {si > 0 && (
                      <div className="my-1.5 h-px bg-border" role="separator" />
                    )}
                    {section.label && (
                      <div className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                        {section.label}
                      </div>
                    )}
                    {section.items.map((item) => {
                      renderIndex += 1
                      const idx = renderIndex
                      const Icon = item.icon
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="menuitem"
                          disabled={item.disabled}
                          onClick={() => select(item)}
                          onMouseEnter={() => setActiveIndex(idx)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                            'disabled:cursor-not-allowed disabled:opacity-40',
                            activeIndex === idx && !item.disabled
                              ? 'bg-white/[0.07]'
                              : 'bg-transparent',
                            item.danger
                              ? 'text-destructive'
                              : 'text-foreground',
                          )}
                        >
                          {Icon && (
                            <span
                              className={cn(
                                'flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60',
                                item.selected
                                  ? 'bg-primary/15 text-primary'
                                  : 'bg-white/[0.03] text-muted-foreground',
                              )}
                            >
                              <Icon className="size-4" />
                            </span>
                          )}
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate font-medium">
                              {item.label}
                            </span>
                            {item.description && (
                              <span className="truncate text-xs text-muted-foreground">
                                {item.description}
                              </span>
                            )}
                          </span>
                          {item.selected && (
                            <Check className="size-4 shrink-0 text-primary" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  )
}

function nextEnabled(items: MenuItem[], from: number, dir: 1 | -1): number {
  if (items.length === 0) return -1
  let i = from
  for (let step = 0; step < items.length; step++) {
    i = (i + dir + items.length) % items.length
    if (!items[i]?.disabled) return i
  }
  return from
}
