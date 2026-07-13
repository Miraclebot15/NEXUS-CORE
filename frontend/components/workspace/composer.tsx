'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp, Mic, MicOff, Paperclip, Zap, Square, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Composer({
  onSend,
  onStop,
  disabled = false,
  streaming = false,
  placeholder = 'Ask anything, upload files, generate images...',
}: {
  onSend: (text: string, files?: File[]) => void
  onStop?: () => void
  disabled?: boolean
  streaming?: boolean
  placeholder?: string
}) {
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [recording, setRecording] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // Load draft on mount
  useEffect(() => {
    const saved = localStorage.getItem('nexus:draft')
    if (saved) setText(saved)
  }, [])

  // Save draft on change
  useEffect(() => {
    localStorage.setItem('nexus:draft', text)
  }, [text])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
  }, [text])

  const send = () => {
    if ((!text.trim() && files.length === 0) || disabled || streaming) return
    onSend(text.trim(), files)
    setText('')
    setFiles([])
    localStorage.removeItem('nexus:draft')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) return
    setFiles(prev => [...prev, ...Array.from(incoming)])
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = e => chunksRef.current.push(e.data)
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], 'voice.webm', { type: 'audio/webm' })
        stream.getTracks().forEach(t => t.stop())
        // Send as file attachment
        onSend('[Voice message]', [file])
      }
      mr.start()
      mediaRecorderRef.current = mr
      setRecording(true)
    } catch { console.warn('Mic access denied') }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  return (
    <div className="relative px-3 pb-4 pt-2">
      {/* File previews */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="mb-2 flex flex-wrap gap-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 rounded-lg border border-white/[0.10] bg-white/[0.06] px-3 py-1.5 text-xs text-white/70 backdrop-blur-sm">
                <Paperclip className="size-3 text-violet-400" />
                <span className="max-w-[120px] truncate">{f.name}</span>
                <button type="button" onClick={() => setFiles(p => p.filter((_, j) => j !== i))}
                  className="ml-1 text-white/40 hover:text-white/80">×</button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main composer glass card */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        className={cn(
          'relative rounded-2xl border transition-all duration-300',
          'backdrop-blur-xl',
          dragOver
            ? 'border-violet-500/60 bg-violet-500/10 shadow-[0_0_30px_rgba(123,47,190,0.3)]'
            : 'border-white/[0.12] bg-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]'
        )}
      >
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder={recording ? 'Listening...' : placeholder}
          disabled={disabled || recording}
          rows={1}
          className="w-full resize-none bg-transparent px-4 pt-4 pb-2 text-[15px] leading-relaxed text-white placeholder:text-white/25 outline-none min-h-[52px] max-h-[200px]"
        />

        {/* Bottom toolbar */}
        <div className="flex items-center gap-1 px-3 pb-3">
          {/* File upload */}
          <input ref={fileInputRef} type="file" multiple className="hidden"
            onChange={e => handleFiles(e.target.files)} />
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="flex size-8 items-center justify-center rounded-xl text-white/35 transition-all hover:bg-white/[0.08] hover:text-violet-400">
            <Paperclip className="size-4" />
          </button>

          {/* Image gen shortcut */}
          <button type="button" onClick={() => setText('Generate an image of ')}
            className="flex size-8 items-center justify-center rounded-xl text-white/35 transition-all hover:bg-white/[0.08] hover:text-violet-400">
            <ImageIcon className="size-4" />
          </button>

          {/* Voice */}
          <button type="button" onClick={recording ? stopRecording : startRecording}
            className={cn(
              'flex size-8 items-center justify-center rounded-xl transition-all',
              recording
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 animate-pulse'
                : 'text-white/35 hover:bg-white/[0.08] hover:text-violet-400'
            )}>
            {recording ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </button>

          {/* Deep research mode */}
          <button type="button"
            className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-[11px] text-white/30 transition-all hover:bg-white/[0.08] hover:text-violet-400 ml-1">
            <Zap className="size-3" />
            <span className="font-mono">Deep</span>
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Send / Stop */}
          {streaming ? (
            <button type="button" onClick={onStop}
              className="flex size-9 items-center justify-center rounded-xl border border-white/[0.15] bg-white/[0.08] text-white/70 transition-all hover:bg-white/[0.14] hover:text-white">
              <Square className="size-3.5 fill-current" />
            </button>
          ) : (
            <button type="button" onClick={send}
              disabled={!text.trim() && files.length === 0}
              className={cn(
                'flex size-9 items-center justify-center rounded-xl transition-all duration-200',
                text.trim() || files.length > 0
                  ? 'bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-[0_4px_16px_rgba(123,47,190,0.5)] hover:shadow-[0_4px_24px_rgba(123,47,190,0.7)] hover:scale-105 active:scale-95'
                  : 'bg-white/[0.06] text-white/25 cursor-not-allowed'
              )}>
              <ArrowUp className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Drag overlay */}
      <AnimatePresence>
        {dragOver && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center rounded-2xl border-2 border-dashed border-violet-500/60 bg-violet-500/10 backdrop-blur-sm">
            <p className="text-sm font-medium text-violet-300">Drop files here</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
