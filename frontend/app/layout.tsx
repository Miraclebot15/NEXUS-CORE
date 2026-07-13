import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google'
import './globals.css'

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-sans',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
})

export const metadata: Metadata = {
  title: 'NEXUS CORE',
  description:
    'A governance-first AI operating console. Every AI-proposed plan is checked by a deterministic policy engine and logged to a tamper-evident audit chain before anything executes.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0b0d10',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
          <html lang="en" className={`dark ${plexSans.variable} ${plexMono.variable}`}>
        <body className="font-sans antialiased">
          {children}
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </body>
      </html>
    
  )
}
