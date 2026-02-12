import { NextApiRequest, NextApiResponse } from 'next'

const PAY_API_BASE_URL = 'https://api.pay.walletconnect.com'
const ALLOWED_HOST_SUFFIX = '.pay.walletconnect.com'
const PATH_SEGMENT_PATTERN = /^[a-zA-Z0-9._~:@!$&'()*+,;=-]+$/

function sanitizePathSegments(segments: string[]): string | null {
  for (const segment of segments) {
    if (!segment || segment === '.' || segment === '..' || !PATH_SEGMENT_PATTERN.test(segment)) {
      return null
    }
  }
  return segments.join('/')
}

function isAllowedTargetUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.hostname.endsWith(ALLOWED_HOST_SUFFIX) && parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.status(200).end()
    return
  }

  try {
    const pathSegments = req.query.path as string[]
    const sanitizedPath = sanitizePathSegments(pathSegments)
    if (!sanitizedPath) {
      res.status(400).json({ error: 'Invalid path' })
      return
    }

    const queryString = new URLSearchParams()
    Object.entries(req.query).forEach(([key, value]) => {
      if (key !== 'path' && typeof value === 'string') {
        queryString.append(key, value)
      }
    })

    const targetUrl = `${PAY_API_BASE_URL}/${sanitizedPath}${queryString.toString() ? `?${queryString.toString()}` : ''}`

    if (!isAllowedTargetUrl(targetUrl)) {
      res.status(400).json({ error: 'Invalid target URL' })
      return
    }

    const apiKey = process.env.NEXT_PUBLIC_PAY_API_KEY
    console.log(`[Pay Proxy] ${req.method} ${targetUrl} (API key: ${apiKey ? 'present' : 'MISSING'})`)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization as string
    }

    if (apiKey) {
      headers['Api-Key'] = apiKey
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    }

    if (req.method === 'POST' && req.body) {
      fetchOptions.body = JSON.stringify(req.body)
    }

    const response = await fetch(targetUrl, fetchOptions)
    const data = await response.json()

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.status(response.status).json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Pay Proxy] Error:', message)
    res.status(500).json({
      error: 'Proxy error',
      message
    })
  }
}
