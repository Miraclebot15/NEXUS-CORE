'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Check, Copy, Code2 } from 'lucide-react'
import { cn } from '@/lib/utils'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-mono text-white/50 hover:text-white/90 hover:bg-white/10 transition-all"
    >
      {copied ? <Check className="size-3 text-green-400" /> : <Copy className="size-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  return (
    <div className="my-4 rounded-xl overflow-hidden border border-white/[0.08] bg-[#0d1117]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.04] border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Code2 className="size-3.5 text-violet-400" />
          <span className="text-[11px] font-mono text-white/40 uppercase tracking-wider">
            {language || 'code'}
          </span>
        </div>
        <CopyButton text={code} />
      </div>
      {/* Code */}
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '16px',
          background: 'transparent',
          fontSize: '13px',
          lineHeight: '1.6',
        }}
        wrapLongLines={true}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}

export function MarkdownRenderer({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn('prose-nexus', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '')
            const code = String(children).replace(/\n$/, '')
            const isBlock = code.includes('\n') || (match && match[1])
            if (isBlock) {
              return <CodeBlock language={match?.[1] || ''} code={code} />
            }
            return (
              <code
                className="rounded-md bg-white/[0.08] px-1.5 py-0.5 text-[13px] font-mono text-violet-300 border border-white/[0.06]"
                {...props}
              >
                {children}
              </code>
            )
          },
          h1: ({ children }) => <h1 className="text-2xl font-bold text-foreground mt-6 mb-3 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-semibold text-foreground mt-5 mb-2.5 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-semibold text-foreground mt-4 mb-2 first:mt-0">{children}</h3>,
          p: ({ children }) => <p className="text-foreground/90 leading-7 mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="my-3 ml-4 space-y-1.5 list-none">{children}</ul>,
          ol: ({ children }) => <ol className="my-3 ml-4 space-y-1.5 list-decimal">{children}</ol>,
          li: ({ children }) => (
            <li className="text-foreground/90 leading-6 flex gap-2 items-start">
              <span className="mt-2 size-1.5 rounded-full bg-violet-400 shrink-0" />
              <span>{children}</span>
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-violet-500/50 pl-4 text-muted-foreground italic">
              {children}
            </blockquote>
          ),
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic text-foreground/80">{children}</em>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer"
              className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-xl border border-white/[0.08]">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2.5 text-left font-semibold text-foreground bg-white/[0.05] border-b border-white/[0.08]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2.5 text-foreground/80 border-b border-white/[0.04] last:border-0">
              {children}
            </td>
          ),
          hr: () => <hr className="my-4 border-white/[0.08]" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
