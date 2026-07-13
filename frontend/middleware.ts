import { NextResponse } from 'next/server'

// Clerk removed entirely for demo purposes -- no auth handshake at all.
export default function middleware() {
  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/sign-in', '/sign-up', '/api/(.*)', '/trpc/(.*)'],
}
