'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Layers, Loader2, X } from 'lucide-react'
import * as api from '@/lib/api-client'
import type { GetToken } from '@/lib/api-client'

type FilterType = 'all' | 'image' | 'video' | 'file'

export function ArtifactsPanel({
  open,
  onClose,
  projectId,
  getToken,
}: {
  open: boolean
  onClose: () => void
  projectId: string
  getToken?: GetToken
}) {
  const [artifacts, setArtifacts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')

  useEffect(() => {
    if (!open || !projectId) return
    let cancelled = false
    setLoading(true)
    api.listProjectArtifacts(projectId, getToken).then((data) => {
      if (!cancelled) {
        setArtifacts(data || [])
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [open, projectId, getToken])

  const filtered = artifacts.filter((a) => {
    if (filter === 'all') return true
    if (filter === 'image') return a.artifact_type === 'image'
    if (filter === 'video') return a.artifact_type === 'video'
    return a.artifact_type !== 'image' && a.artifact_type !== 'video'
  })

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-end bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong flex h-full w-full max-w-md flex-col border-l border-border shadow-2xl shadow-black/60"
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
              <Layers className="size-4 text-primary" />
              <p className="text-sm font-semibold">Artifacts</p>
              {loading && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
              <button
                type="button"
                onClick={onClose}
                className="ml-auto flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="flex gap-2 border-b border-border px-4 py-2.5">
              {(['all', 'image', 'video', 'file'] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-3 py-1 text-xs capitalize transition-colors ${
                    filter === f
                      ? 'bg-white/15 text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!loading && filtered.length === 0 && (
                <p className="mt-8 text-center text-sm text-muted-foreground">
                  No artifacts yet — generated images, videos, and files will show up here.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                {filtered.map((a) => {
                  let parsed: any = null
                  try {
                    parsed = typeof a.content === 'string' ? JSON.parse(a.content) : a.content
                  } catch {
                    parsed = null
                  }
                  return (
                    <div key={a.id} className="flex flex-col gap-1.5">
                      {a.artifact_type === 'image' && parsed?.url ? (
                        <img src={parsed.url} alt={a.title} className="w-full rounded-lg object-cover" />
                      ) : a.artifact_type === 'video' && parsed?.url ? (
                        <video src={parsed.url} controls className="w-full rounded-lg" />
                      ) : (
                        <div className="rounded-lg border border-white/10 p-2.5 text-xs text-muted-foreground">
                          <p className="truncate font-medium text-foreground/80">{a.title}</p>
                          <p className="mt-0.5 truncate text-[10px] uppercase tracking-wide opacity-60">
                            {a.artifact_type}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
