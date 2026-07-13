'use client'
import { useState } from 'react'
import { ChevronDown, Globe, ExternalLink, Play } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { ArtifactItem, SearchResultItem } from '@/lib/orchestration'

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', '') }
  catch { return url }
}

function FaviconOrIcon({ url, type }: { url: string; type: 'web' | 'youtube' }) {
  if (type === 'youtube') return <Play className="size-3 text-red-400 shrink-0" />
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${getDomain(url)}&sz=16`}
      className="size-3 shrink-0 rounded-sm"
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      alt=""
    />
  )
}

function WebSourceCard({ result, index }: { result: SearchResultItem; index: number }) {
  return (
    <motion.a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="group flex flex-col gap-1 rounded-lg border border-border/50 bg-white/[0.02] p-2.5 transition-colors hover:bg-white/[0.05] hover:border-border"
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <FaviconOrIcon url={result.url} type="web" />
        <span className="text-[10px] text-muted-foreground truncate">{getDomain(result.url)}</span>
        <ExternalLink className="size-2.5 text-muted-foreground/40 shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">{result.title}</p>
      {result.snippet && (
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{result.snippet}</p>
      )}
    </motion.a>
  )
}

function YouTubeCard({ result, index }: { result: any; index: number }) {
  return (
    <motion.a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="group flex gap-2.5 rounded-lg border border-border/50 bg-white/[0.02] p-2.5 transition-colors hover:bg-white/[0.05] hover:border-border"
    >
      {result.thumbnail ? (
        <img src={result.thumbnail} alt="" className="w-20 h-14 rounded object-cover shrink-0 bg-white/5" />
      ) : (
        <div className="w-20 h-14 rounded bg-white/5 shrink-0 flex items-center justify-center">
          <Play className="size-5 text-red-400/50" />
        </div>
      )}
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <FaviconOrIcon url={result.url} type="youtube" />
          <span className="text-[10px] text-muted-foreground truncate">{result.channel || 'YouTube'}</span>
          <ExternalLink className="size-2.5 text-muted-foreground/40 shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">{result.title}</p>
        {result.description && (
          <p className="text-[11px] text-muted-foreground line-clamp-1">{result.description}</p>
        )}
      </div>
    </motion.a>
  )
}

export function SearchResults({ artifacts }: { artifacts: ArtifactItem[] }) {
  const [open, setOpen] = useState(false)

  const webArtifacts = artifacts.filter(a => a.artifactType === 'search_results')
  const youtubeArtifacts = artifacts.filter(a => a.artifactType === 'youtube_results')

  if (webArtifacts.length === 0 && youtubeArtifacts.length === 0) return null

  const allWebResults: SearchResultItem[] = webArtifacts.flatMap(a => {
    const raw = a.content as any
    const c = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(c?.results) ? c.results : []
  })

  const allPlayResults: any[] = youtubeArtifacts.flatMap(a => {
    const raw = a.content as any
    const c = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(c?.results) ? c.results : []
  })

  const totalSources = allWebResults.length + allPlayResults.length
  if (totalSources === 0) return null

  return (
    <div className="mt-3 w-full">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 rounded-full border border-border/60 bg-white/[0.03] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
      >
        <Globe className="size-3 shrink-0" />
        <span>
          {totalSources} source{totalSources !== 1 ? 's' : ''}
          {allPlayResults.length > 0 && ` · ${allPlayResults.length} video${allPlayResults.length !== 1 ? 's' : ''}`}
        </span>
        <ChevronDown className={cn('size-3 shrink-0 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-4">
              {allWebResults.length > 0 && (
                <div>
                  {allWebResults.length > 0 && allPlayResults.length > 0 && (
                    <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                      <Globe className="size-3" /> Web
                    </p>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {allWebResults.map((r, i) => <WebSourceCard key={i} result={r} index={i} />)}
                  </div>
                </div>
              )}
              {allPlayResults.length > 0 && (
                <div>
                  {allWebResults.length > 0 && (
                    <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                      <Play className="size-3 text-red-400" /> Videos
                    </p>
                  )}
                  <div className="grid gap-2">
                    {allPlayResults.map((r, i) => <YouTubeCard key={i} result={r} index={i} />)}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
