'use client'

import { motion } from 'framer-motion'
import { X, Download, FileText, Image as ImageIcon, Music, Video, Table } from 'lucide-react'
import type { ArtifactItem } from '@/lib/orchestration'

function ImageArtifact({ content }: { content: any }) {
  if (content.error || !content.url) {
    return <p className="text-xs text-muted-foreground">Image generation failed: {content.error || 'no URL returned'}</p>
  }
  return (
    <div className="space-y-3">
      <img src={content.url} alt={content.prompt || ''} className="w-full rounded-lg border border-white/[0.08]" />
      <a
        href={content.url}
        download
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
      >
        <Download className="size-3" /> Download image
      </a>
    </div>
  )
}

function DocumentArtifact({ content }: { content: any }) {
  if (content.error) {
    return <p className="text-xs text-muted-foreground">Couldn't read file: {content.error}</p>
  }
  return (
    <div className="space-y-2">
      {content.file && <p className="text-[10px] text-muted-foreground/60 truncate">{content.file}</p>}
      {content.pages && <p className="text-[10px] text-muted-foreground/60">{content.pages} pages</p>}
      <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">{content.content}</p>
    </div>
  )
}

function AudioArtifact({ content }: { content: any }) {
  if (content.error) {
    return <p className="text-xs text-muted-foreground">Audio generation failed: {content.error}</p>
  }
  const src = content.audio_url || content.audio_path
  return (
    <div className="space-y-2">
      <p className="text-xs text-foreground/80">{content.text}</p>
      {src ? (
        <audio controls className="w-full" src={src} />
      ) : (
        <p className="text-[10px] text-muted-foreground/60">Audio file generated server-side, no playable URL yet.</p>
      )}
    </div>
  )
}

function AnalysisArtifact({ content }: { content: any }) {
  if (content.error) {
    return <p className="text-xs text-muted-foreground">Analysis failed: {content.error}</p>
  }
  return <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">{content.result}</p>
}

function iconFor(artifactType: string) {
  switch (artifactType) {
    case 'image': return ImageIcon
    case 'document': return FileText
    case 'spreadsheet': return Table
    case 'audio': return Music
    case 'video_analysis': return Video
    default: return FileText
  }
}

export function ArtifactPanel({ artifact, onClose }: { artifact: ArtifactItem | null; onClose: () => void }) {
  if (!artifact) return null
  const content = artifact.content as any
  const Icon = iconFor(artifact.artifactType)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <h3 className="truncate text-sm font-medium text-foreground">{artifact.title}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="flex-1 overflow-y-auto p-4"
      >
        {artifact.artifactType === 'image' && <ImageArtifact content={content} />}
        {(artifact.artifactType === 'document' || artifact.artifactType === 'spreadsheet') && (
          <DocumentArtifact content={content} />
        )}
        {artifact.artifactType === 'audio' && <AudioArtifact content={content} />}
        {(artifact.artifactType === 'image_analysis' || artifact.artifactType === 'video_analysis') && (
          <AnalysisArtifact content={content} />
        )}
      </motion.div>
    </div>
  )
}
