import type { NextApiRequest, NextApiResponse } from 'next'

import { crossOrigin, endSession, sessionOf, startSession } from '@/lib/session'

/**
 * Nimbus's demo sign-in (see lib/session.ts).
 *
 * GET → { user } or { user: null }; POST signs in as "demo"; DELETE signs out.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('cache-control', 'no-store')
  if (req.method === 'GET') return res.status(200).json({ user: sessionOf(req)?.user ?? null })
  if (crossOrigin(req)) return res.status(403).json({ error: 'cross-origin' })
  if (req.method === 'POST')
    return res.status(200).json({ user: startSession(req, res, 'demo').user })
  if (req.method === 'DELETE') {
    endSession(req, res)
    return res.status(200).json({ user: null })
  }
  res.status(405).json({ error: 'GET, POST or DELETE' })
}
