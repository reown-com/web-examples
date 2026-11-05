import { NextApiRequest, NextApiResponse } from 'next'
import {
  MCP_CALLBACK_PATH,
  MCP_CLIENT_METADATA_PATH,
  MCP_CLIENT_NAME,
  MCP_SCOPES
} from '@/utils/McpAuthUtil'

/**
 * OAuth client ID metadata document for hosted deployments.
 * On a non-loopback origin the wallet uses this URL as its `client_id`; the MCP
 * authorization server fetches it, so the document must name itself and list
 * redirect URIs on the same origin. Local dev registers dynamically instead.
 */
function firstHeader(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  return raw?.split(',')[0]?.trim() || undefined
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    res.status(405).end()
    return
  }

  const host = firstHeader(req.headers['x-forwarded-host']) ?? req.headers.host
  if (!host) {
    res.status(400).json({ error: 'Missing host header' })
    return
  }
  const proto =
    firstHeader(req.headers['x-forwarded-proto']) ??
    (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? 'http' : 'https')
  const origin = `${proto}://${host}`

  res.setHeader('Cache-Control', 'public, max-age=300')
  res.status(200).json({
    client_id: `${origin}${MCP_CLIENT_METADATA_PATH}`,
    client_name: MCP_CLIENT_NAME,
    client_uri: origin,
    logo_uri: 'https://avatars.githubusercontent.com/u/37784886',
    redirect_uris: [`${origin}${MCP_CALLBACK_PATH}`],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    scope: MCP_SCOPES
  })
}
