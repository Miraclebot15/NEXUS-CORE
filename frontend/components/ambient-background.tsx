'use client'

export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      {/* Base — very dark purple-black */}
      <div className="absolute inset-0" style={{ background: '#07000f' }} />

      {/* Central purple bloom */}
      <div className="absolute rounded-full"
        style={{
          width: '120vw', height: '120vw',
          maxWidth: 1000, maxHeight: 1000,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -60%)',
          background: 'radial-gradient(circle, rgba(123,47,190,0.22) 0%, rgba(79,70,229,0.10) 35%, transparent 65%)',
          filter: 'blur(40px)',
          animation: 'breathe 8s ease-in-out infinite',
        }}
      />

      {/* Top-left magenta accent */}
      <div className="absolute rounded-full"
        style={{
          width: '60vw', height: '60vw',
          maxWidth: 500, maxHeight: 500,
          top: '-10%', left: '-5%',
          background: 'radial-gradient(circle, rgba(192,38,211,0.18) 0%, transparent 65%)',
          filter: 'blur(60px)',
          animation: 'orb-drift-1 20s ease-in-out infinite',
        }}
      />

      {/* Bottom-right blue accent */}
      <div className="absolute rounded-full"
        style={{
          width: '55vw', height: '55vw',
          maxWidth: 480, maxHeight: 480,
          bottom: '-5%', right: '-5%',
          background: 'radial-gradient(circle, rgba(79,70,229,0.20) 0%, transparent 65%)',
          filter: 'blur(60px)',
          animation: 'orb-drift-2 25s ease-in-out infinite',
        }}
      />

      {/* Bottom center warm glow */}
      <div className="absolute rounded-full"
        style={{
          width: '70vw', height: '40vw',
          maxWidth: 600, maxHeight: 300,
          bottom: '-5%', left: '15%',
          background: 'radial-gradient(ellipse, rgba(139,92,246,0.12) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />

      {/* Noise grain */}
      <div className="absolute inset-0"
        style={{
          opacity: 0.04,
          backgroundImage: "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.75%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')",
          backgroundSize: '200px 200px',
          mixBlendMode: 'overlay',
        }}
      />
    </div>
  )
}
