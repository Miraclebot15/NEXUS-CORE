'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_NEXUS_API_URL || 'http://nexus-core-app.duckdns.org:8000'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.8 32.4 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.3 2.8l5.7-5.7C33.5 7 29 5 24 5 13 5 4 14 4 25s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-4.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.9 18.9 13 24 13c2.8 0 5.3 1 7.3 2.8l5.7-5.7C33.5 7 29 5 24 5c-7.7 0-14.3 4.4-17.7 10.7z"/>
      <path fill="#4CAF50" d="M24 45c5.2 0 9.9-1.7 13.6-4.7l-6.3-5.3C29.3 36.5 26.8 37 24 37c-5.3 0-9.8-3.5-11.4-8.3l-6.5 5C9.6 40.4 16.2 45 24 45z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.3 5.5-6.1 7l6.3 5.3C39.9 37 44 31.5 44 25c0-1.3-.1-2.7-.4-4.5z"/>
    </svg>
  )
}

function Logomark() {
  return (
    <div className="flex size-11 items-center justify-center rounded-xl bg-[#1A1A1F] border border-white/[0.08]">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" stroke="white" strokeOpacity="0.8" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M12 2v20M3 7l9 5 9-5M3 17l9-5 9 5" stroke="white" strokeOpacity="0.35" strokeWidth="1" strokeLinejoin="round"/>
      </svg>
    </div>
  )
}

export default function SignInPage() {
  const [showPrivacy, setShowPrivacy] = useState(false)

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#0B0B0D] px-6">
      <div className="w-full max-w-[380px]">
        <div className="flex flex-col items-center text-center mb-8">
          <Logomark />
          <h1 className="mt-5 text-[20px] font-semibold text-white">Welcome to NEXUS CORE</h1>
          <p className="mt-2 text-[14px] text-white/45">
            Sign in to continue to your workspace
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#111113] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
          <a
            href={`${API_BASE}/auth/google/login`}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-white/10 bg-white py-3 text-[14px] font-medium text-black transition-colors hover:bg-white/90"
          >
            <GoogleIcon />
            Continue with Google
          </a>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/[0.08]" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/25">or</span>
            <div className="h-px flex-1 bg-white/[0.08]" />
          </div>

          <a
            href={`${API_BASE}/auth/demo-login`}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-transparent py-3 text-[14px] font-medium text-white/70 transition-colors hover:border-white/[0.15] hover:bg-white/[0.03] hover:text-white/90"
          >
            Continue with Demo
          </a>
          <p className="mt-2.5 text-center text-[11.5px] text-white/30">
            Explore the workspace — email sending isn&apos;t available in demo mode.
          </p>
        </div>

        <p className="mt-6 text-center text-[12px] leading-relaxed text-white/30">
          By continuing, you agree to our{' '}
          <button
            onClick={() => setShowPrivacy(true)}
            className="text-white/50 underline underline-offset-2 hover:text-white/70"
          >
            Privacy Policy
          </button>
          . Intended for users 13 and older.
        </p>
      </div>

      {showPrivacy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setShowPrivacy(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[75vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#111113] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-white/90">Privacy Policy</h2>
              <button onClick={() => setShowPrivacy(false)} className="text-white/40 hover:text-white/70">
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-3 text-[13px] leading-relaxed text-white/55">
              <p>When you sign in with Google, NEXUS CORE requests access to your email, calendar, drive, docs/sheets, contacts, and YouTube account — strictly to perform actions you explicitly request.</p>
              <p>We never send emails, create events, or modify files without your request. Actions with real-world effects are shown to you transparently after they occur.</p>
              <p>Access tokens are stored securely and used only to act on your behalf. We do not sell or share your data with third parties.</p>
              <p>Intended for users aged 13 and older.</p>
              <p className="text-white/35">Hackathon prototype — full legal review pending.</p>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
