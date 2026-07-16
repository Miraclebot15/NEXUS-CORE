'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAdaptiveGreeting } from '@/lib/context/greeting-engine'
import { generateAdaptivePrompts } from '@/lib/context/adaptive-prompt-engine'
import { collectWorkspaceContext } from '@/lib/context/context-collector'

const DEFAULT_PROMPTS = [
  "What are we building today?"
]

function getGreeting(name?: string): { line1: string; line2: string } {
  const greeting = getAdaptiveGreeting({
    userName: name,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })

  return {
    line1: greeting.headline,
    line2: greeting.subtitle,
  }
}

function NexusOrb() {
  return (
    <div className="relative mx-auto mb-8" style={{ width: 96, height: 96 }}>
      {/* Outer glow ring */}
      <div className="absolute inset-0 rounded-full animate-[spin_8s_linear_infinite]"
        style={{ background: 'conic-gradient(from 0deg, transparent, #7B2FBE, transparent, #C026D3, transparent)', padding: 2, borderRadius: '50%' }}>
        <div className="w-full h-full rounded-full" style={{ background: '#0a0010' }} />
      </div>
      {/* Inner orb */}
      <div className="absolute inset-2 rounded-full"
        style={{
          background: 'radial-gradient(circle at 35% 35%, #C026D3, #7B2FBE 50%, #4F46E5 80%, #0a0010)',
          boxShadow: '0 0 40px rgba(192,38,211,0.6), 0 0 80px rgba(123,47,190,0.3), inset 0 0 20px rgba(255,255,255,0.1)',
          animation: 'breathe 4s ease-in-out infinite',
        }}
      />
      {/* Shine */}
      <div className="absolute rounded-full"
        style={{ top: '18%', left: '22%', width: '28%', height: '18%', background: 'rgba(255,255,255,0.35)', filter: 'blur(4px)', transform: 'rotate(-30deg)', borderRadius: '50%' }}
      />
      {/* N letter */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-black text-white" style={{ textShadow: '0 0 20px rgba(255,255,255,0.8)' }}>N</span>
      </div>
    </div>
  )
}

export function Welcome({
  onSend,
  projects = [],
  messages = [],
  status = 'idle',
}: {
  onSend?: (text: string) => void
  projects?: any[]
  messages?: any[]
  status?: string
}) {
  const [prompts, setPrompts] = useState<string[]>(DEFAULT_PROMPTS)
  const [promptIdx, setPromptIdx] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [typing, setTyping] = useState(true)
  const { line1, line2 } = getGreeting()

  useEffect(() => {

    const workspaceContext = collectWorkspaceContext({
      projects,
      messages,
      status,
    })

    const adaptive = generateAdaptivePrompts({
      ...workspaceContext,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      currentHour: new Date().getHours(),
    })

    const generated = adaptive.map(
      item => item.text
    )

    if (generated.length) {
      setPrompts(generated)
    }

  }, [projects, messages, status])


  useEffect(() => {
    const target = prompts[promptIdx] ?? DEFAULT_PROMPTS[0]
    let i = 0
    setDisplayed('')
    setTyping(true)
    const interval = setInterval(() => {
      if (i < target.length) { setDisplayed(target.slice(0, i + 1)); i++ }
      else { clearInterval(interval); setTyping(false); setTimeout(() => setPromptIdx(p => (p + 1) % (prompts.length || 1)), 2000) }
    }, 42)
    return () => clearInterval(interval)
  }, [promptIdx])

  return (
    <div className="relative flex flex-col items-center justify-center min-h-full px-6 py-16 text-center overflow-hidden">

      {/* Background bloom */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div style={{
          width: '140vw', height: '140vw', maxWidth: 900, maxHeight: 900,
          background: 'radial-gradient(circle, rgba(123,47,190,0.25) 0%, rgba(79,70,229,0.12) 40%, transparent 70%)',
          borderRadius: '50%',
          animation: 'breathe 6s ease-in-out infinite',
        }} />
      </div>

      {/* Orb logo */}
      <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
        <NexusOrb />
      </motion.div>

      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }} className="mb-2">
        <h1 className="font-black tracking-tight leading-none mb-3"
          style={{ fontSize: 'clamp(2rem, 8vw, 3.2rem)',
            background: 'linear-gradient(135deg, #ffffff 0%, #e0d7ff 40%, #c084fc 70%, #f0abfc 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          {line1}
        </h1>
        <p className="text-lg font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>{line2}</p>
      </motion.div>

      {/* Typing animation */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="mt-8 mb-2 flex items-center justify-center gap-1 min-h-8">
        <span className="font-mono text-sm" style={{ color: 'rgba(192,38,211,0.7)' }}>{displayed}</span>
        <span className="w-0.5 h-4 rounded-full inline-block" style={{ background: '#C026D3', animation: 'typing-cursor 1s steps(1) infinite' }} />
      </motion.div>

      {/* Tagline */}
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
        className="mt-10 text-xs font-mono tracking-[0.2em] uppercase"
        style={{ color: 'rgba(255,255,255,0.2)' }}>
        Governed · Transparent · Trustworthy
      </motion.p>
    </div>
  )
}
