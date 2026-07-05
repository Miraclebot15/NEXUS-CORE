'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, ScrollText, ShieldCheck, ShieldOff, X } from 'lucide-react'
import * as api from '@/lib/api-client'
import type { GetToken } from '@/lib/api-client'

interface AuditRecord {
  task_id: string
  stage: string
  label: string
  detail: unknown
  timestamp: string
  record_hash: string
}

export function GovernanceLogs({
  open,
  onClose,
  getToken,
}: {
  open: boolean
  onClose: () => void
  getToken?: GetToken
}) {
  const [records, setRecords] = useState<AuditRecord[]>([])
  const [chainValid, setChainValid] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)
    api
      .getAudit(100, getToken)
      .then((res) => {
        if (cancelled) return
        setRecords(res.records as AuditRecord[])
        setChainValid(res.chain_valid)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load audit log.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, getToken])

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
              <ScrollText className="size-4 text-primary" />
              <p className="text-sm font-semibold">Governance Logs</p>
              {loading && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
              <button
                type="button"
                onClick={onClose}
                className="ml-auto flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-xs">
              {chainValid === null ? (
                <span className="text-muted-foreground">{'Verifying chain integrity\u2026'}</span>
              ) : chainValid ? (
                <>
                  <ShieldCheck className="size-3.5 text-[oklch(0.72_0.14_160)]" />
                  <span className="text-muted-foreground">
                    Hash chain verified across all {records.length} records
                  </span>
                </>
              ) : (
                <>
                  <ShieldOff className="size-3.5 text-destructive" />
                  <span className="text-destructive">Chain integrity failure detected</span>
                </>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {error && <p className="px-2 py-4 text-sm text-destructive">{error}</p>}
              {!error && !loading && records.length === 0 && (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                  No orchestration activity logged yet.
                </p>
              )}
              <div className="space-y-2">
                {records.map((r, i) => (
                  <div
                    key={`${r.task_id}-${i}`}
                    className="rounded-lg border border-border/60 bg-white/[0.02] p-2.5 text-xs"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="font-mono font-medium text-foreground">{r.stage}</span>
                      <span className="font-mono text-muted-foreground/70">
                        {r.record_hash?.slice(0, 8) || '--------'}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{r.label}</p>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground/60">
                      {new Date(r.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
