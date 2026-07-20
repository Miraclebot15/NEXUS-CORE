'use client'
import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function CallbackInner() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const token = params.get('token')
    if (token) {
      localStorage.setItem('nexus_session', token)

      const next =
        params.get('next') ||
        sessionStorage.getItem('nexus_next') ||
        '/'

      sessionStorage.removeItem('nexus_next')

      router.replace(next)
    } else {
      router.replace('/sign-in')
    }
  }, [params, router])

  return (
    <p className="text-sm text-muted-foreground animate-pulse">Signing you in...</p>
  )
}

export default function AuthCallback() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading...</p>}>
        <CallbackInner />
      </Suspense>
    </main>
  )
}
