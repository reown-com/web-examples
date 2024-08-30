import { NextResponse, NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const origin = req.headers.get('origin')

  if (process.env.NODE_ENV === 'production') {
    // In production, allow all origins
    res.headers.set('Access-Control-Allow-Origin', '*')
  } else {
    // In development, only allow localhost
    const allowedOrigins = ['http://localhost:3000']
    if (origin && allowedOrigins.includes(origin)) {
      res.headers.set('Access-Control-Allow-Origin', origin)
    }
  }

  // Common headers for both environments
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' ? '*' : (origin || ''),
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })
  }

  return res
}