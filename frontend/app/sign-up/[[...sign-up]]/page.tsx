import { SignUp } from '@clerk/nextjs'
import { NexusMark } from '@/components/workspace/nexus-mark'

export default function SignUpPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-background px-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-primary/10 text-primary">
          <NexusMark size={22} />
        </div>
        <div>
          <p className="font-mono text-sm font-semibold tracking-[0.2em]">NEXUS CORE</p>
          <p className="text-xs text-muted-foreground">Governance-first AI console</p>
        </div>
      </div>
      <SignUp
        appearance={{
          variables: {
            colorPrimary: '#3e7bfa',
            colorBackground: '#14171b',
            colorInputBackground: '#0b0d10',
            colorText: '#e9ecee',
            colorTextSecondary: '#8b95a1',
            borderRadius: '0.65rem',
            fontFamily: 'var(--font-plex-sans)',
          },
          elements: {
            card: 'border border-white/10 shadow-none',
            headerTitle: 'font-sans',
            footerActionLink: 'text-primary hover:text-primary/80',
          },
        }}
      />
    </main>
  )
}
