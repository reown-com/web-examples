import { NextApiRequest, NextApiResponse } from 'next'

const PAY_API_BASE_URL = 'https://api.pay.walletconnect.com'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return res.status(200).end()
  }

  try {
    // Build the target URL from the path segments
    const pathSegments = req.query.path as string[]
    const targetPath = pathSegments.join('/')

    // Build query string
    const queryString = new URLSearchParams()
    Object.entries(req.query).forEach(([key, value]) => {
      if (key !== 'path' && typeof value === 'string') {
        queryString.append(key, value)
      }
    })

    const targetUrl = `${PAY_API_BASE_URL}/${targetPath}${queryString.toString() ? `?${queryString.toString()}` : ''}`

    const apiKey = process.env.NEXT_PUBLIC_PAY_API_KEY
    console.log(`[Pay Proxy] ${req.method} ${targetUrl} (API key: ${apiKey ? 'present' : 'MISSING'})`)

    // Forward the request
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Forward authorization header if present
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization as string
    }

    // Add API key from server-side env (Pay API expects 'Api-Key' header)
    if (apiKey) {
      headers['Api-Key'] = apiKey
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    }

    // Add body for POST requests
    if (req.method === 'POST' && req.body) {
      fetchOptions.body = JSON.stringify(req.body)
    }

    const response = await fetch(targetUrl, fetchOptions)
    const data = await response.json()

    // Set CORS headers on response
    res.setHeader('Access-Control-Allow-Origin', '*')

    return res.status(response.status).json(data)
  } catch (error: any) {
    console.error('[Pay Proxy] Error:', error)
    return res.status(500).json({
      error: 'Proxy error',
      message: error.message
    })
  }
}
