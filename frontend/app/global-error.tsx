'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{ padding: 40, fontFamily: 'monospace', color: 'white', background: '#0D0D14', minHeight: '100vh' }}>
          <h2>Something crashed:</h2>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#ff6b6b' }}>{error.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, opacity: 0.7 }}>{error.stack}</pre>
          <button onClick={() => reset()} style={{ marginTop: 20, padding: '8px 16px' }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
