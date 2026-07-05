'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, MessageSquare, Search, X } from 'lucide-react'
import * as api from '@/lib/api-client'
import type { GetToken } from '@/lib/api-client'

export function MemorySearch({
  open,
  onClose,
  onOpenConversation,
  getToken,
}: {
  open: boolean
  onClose: () => void
  onOpenConversation: (conversationId: string) => void
  getToken?: GetToken
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<api.MessageSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setResults([])
      setError(null)
    }
  }, [open])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    const handle = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await api.searchMessages(query.trim(), getToken)
        setResults(res)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed.')
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(handle)
  }, [query, getToken])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong w-full max-w-xl overflow-hidden rounded-2xl border border-border shadow-2xl shadow-black/60"
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search everything you've discussed with NEXUS CORE..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
              />
              {loading && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
              <button
                type="button"
                onClick={onClose}
                className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-2">
              {error && <p className="px-3 py-4 text-sm text-destructive">{error}</p>}

              {!error && !loading && query.trim() && results.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No messages matched {'\u201c'}
                  {query}
                  {'\u201d'}.
                </p>
              )}

              {!error && !query.trim() && (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  This searches your full conversation history via full-text search &mdash; no
                  vector embeddings, just real keyword relevance over what you{'\u2019'}ve actually
                  said.
                </p>
              )}

              {results.map((r) => (
                <button
                  key={r.message_id}
                  onClick={() => {
                    onOpenConversation(r.conversation_id)
                    onClose()
                  }}
                  className="flex w-full flex-col gap-1 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MessageSquare className="size-3.5" />
                    <span className="truncate font-medium text-foreground">
                      {r.conversation_title}
                    </span>
                    <span className="ml-auto shrink-0 uppercase tracking-wide">{r.role}</span>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{r.content}</p>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
