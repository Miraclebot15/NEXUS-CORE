'use client'

import { memo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Check, Copy, Code2 } from 'lucide-react'
import { cn } from '@/lib/utils'

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code)
      } else {
        // Fallback for HTTP / mobile
        const ta = document.createElement('textarea')
        ta.value = code
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {}
  }
  return (
    <div className="group/code my-4 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0d1117]">
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.03] px-4 py-2">
        <div className="flex items-center gap-2">
          <Code2 className="size-3.5 text-violet-400/70" />
          <span className="font-mono text-[11px] text-white/40 uppercase tracking-wider">
            {language || 'code'}
          </span>
        </div>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
        >
          {copied ? (
            <><Check className="size-3 text-green-400" /> Copied</>
          ) : (
            <><Copy className="size-3" /> Copy</>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{ margin: 0, padding: '16px', background: 'transparent', fontSize: '13px', lineHeight: '1.6' }}
        wrapLongLines={true}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}

export const Markdown = memo(function Markdown({
  content,
  streaming = false,
}: {
  content: string
  streaming?: boolean
}) {
  return (
    <div className={cn(
      'max-w-none text-[15px] leading-relaxed text-foreground/90',
      '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
      streaming && '[&>*:last-child]:stream-caret',
    )}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '')
            const code = String(children).replace(/\n$/, '')
            if (match || code.includes('\n')) {
              return <CodeBlock language={match?.[1] || ''} code={code} />
            }
            return (
              <code className="rounded-md bg-white/[0.08] px-1.5 py-0.5 text-[13px] font-mono text-violet-300 border border-white/[0.06]" {...props}>
                {children}
              </code>
            )
          },
          p: ({ children }) => <p className="my-3 leading-relaxed">{children}</p>,
          h1: ({ children }) => <h1 className="mb-3 mt-6 text-xl font-semibold tracking-tight text-foreground">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-2.5 mt-5 text-lg font-semibold tracking-tight text-foreground">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2 mt-4 text-base font-semibold text-foreground">{children}</h3>,
          ul: ({ children }) => <ul className="my-3 space-y-1.5 ml-1">{children}</ul>,
          ol: ({ children }) => <ol className="my-3 space-y-1.5 ml-4 list-decimal">{children}</ol>,
          li: ({ children }) => (
            <li className="flex items-start gap-2.5 leading-relaxed">
              <span className="mt-[9px] size-1.5 rounded-full bg-violet-400/70 shrink-0" />
              <span>{children}</span>
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-violet-500/40 pl-4 text-muted-foreground italic">
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
            <th className="px-4 py-2.5 text-left font-semibold text-foreground bg-white/[0.04] border-b border-white/[0.08]">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2.5 text-foreground/80 border-b border-white/[0.04] last:border-0">{children}</td>
          ),
          hr: () => <hr className="my-4 border-white/[0.08]" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
})
