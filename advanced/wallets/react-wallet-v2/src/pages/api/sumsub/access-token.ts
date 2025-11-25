import { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'

const SUMSUB_APP_TOKEN = process.env.NEXT_PUBLIC_SUMSUB_APP_TOKEN || ''
const SUMSUB_SECRET_KEY = process.env.NEXT_PUBLIC_SUMSUB_SECRET_KEY || ''
const SUMSUB_LEVEL_NAME = process.env.NEXT_PUBLIC_SUMSUB_LEVEL_NAME || 'id-and-liveness'
const SUMSUB_BASE_URL = 'https://api.sumsub.com'
process.env.SUMSUB_APP_TOKEN = SUMSUB_APP_TOKEN
process.env.SUMSUB_SECRET_KEY = SUMSUB_SECRET_KEY
process.env.SUMSUB_LEVEL_NAME = SUMSUB_LEVEL_NAME
process.env.SUMSUB_BASE_URL = SUMSUB_BASE_URL

interface AccessTokenResponse {
  token: string
  userId: string
}

interface ErrorResponse {
  error: string
  message: string
}

/**
 * Creates a signature for Sumsub API requests
 */
function createSignature(ts: number, method: string, path: string, body: string = ''): string {
  const data = ts + method.toUpperCase() + path + body
  return crypto.createHmac('sha256', SUMSUB_SECRET_KEY).update(data).digest('hex')
}

/**
 * Creates an applicant in Sumsub if they don't exist
 */
async function createApplicant(externalUserId: string): Promise<string> {
  const ts = Math.floor(Date.now() / 1000)
  const path = '/resources/applicants?levelName=' + encodeURIComponent(SUMSUB_LEVEL_NAME)
  const method = 'POST'
  const body = JSON.stringify({
    externalUserId,
    type: 'individual'
  })

  const signature = createSignature(ts, method, path, body)

  const response = await fetch(SUMSUB_BASE_URL + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-App-Token': SUMSUB_APP_TOKEN,
      'X-App-Access-Sig': signature,
      'X-App-Access-Ts': ts.toString()
    },
    body
  })

  if (!response.ok) {
    const errorText = await response.text()
    // If applicant already exists, try to get their ID
    if (response.status === 409) {
      return await getApplicantId(externalUserId)
    }
    // Check for level not found error
    if (response.status === 404 && errorText.includes('Level') && errorText.includes('not found')) {
      throw new Error(
        `KYC Level '${SUMSUB_LEVEL_NAME}' not found. Please check your Sumsub Dashboard for the correct level name and set NEXT_PUBLIC_SUMSUB_LEVEL_NAME in your .env.local file.`
      )
    }
    throw new Error(`Failed to create applicant: ${errorText}`)
  }

  const data = await response.json()
  return data.id
}

/**
 * Gets an existing applicant's ID by external user ID
 */
async function getApplicantId(externalUserId: string): Promise<string> {
  const ts = Math.floor(Date.now() / 1000)
  const path = `/resources/applicants/-;externalUserId=${encodeURIComponent(externalUserId)}/one`
  const method = 'GET'

  const signature = createSignature(ts, method, path)

  const response = await fetch(SUMSUB_BASE_URL + path, {
    method,
    headers: {
      'X-App-Token': SUMSUB_APP_TOKEN,
      'X-App-Access-Sig': signature,
      'X-App-Access-Ts': ts.toString()
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to get applicant: ${errorText}`)
  }

  const data = await response.json()
  return data.id
}

/**
 * Generates an access token for the Sumsub WebSDK
 */
async function generateAccessToken(externalUserId: string): Promise<{ token: string }> {
  const ts = Math.floor(Date.now() / 1000)
  const path = `/resources/accessTokens?userId=${encodeURIComponent(
    externalUserId
  )}&levelName=${encodeURIComponent(SUMSUB_LEVEL_NAME)}`
  const method = 'POST'

  const signature = createSignature(ts, method, path)

  const response = await fetch(SUMSUB_BASE_URL + path, {
    method,
    headers: {
      'X-App-Token': SUMSUB_APP_TOKEN,
      'X-App-Access-Sig': signature,
      'X-App-Access-Ts': ts.toString()
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to generate access token: ${errorText}`)
  }

  const data = await response.json()
  return { token: data.token }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AccessTokenResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ error: 'Method not allowed', message: 'Only POST requests are accepted' })
  }

  // Check if Sumsub credentials are configured
  if (!SUMSUB_APP_TOKEN || !SUMSUB_SECRET_KEY) {
    return res.status(500).json({
      error: 'Configuration error',
      message:
        'Sumsub credentials are not configured. Please set NEXT_PUBLIC_SUMSUB_APP_TOKEN and NEXT_PUBLIC_SUMSUB_SECRET_KEY environment variables.'
    })
  }

  const { address } = req.body

  if (!address || typeof address !== 'string') {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'Ethereum address is required'
    })
  }

  // Normalize address to lowercase for consistency
  const normalizedAddress = address.toLowerCase()

  try {
    // First, ensure the applicant exists (create if needed)
    await createApplicant(normalizedAddress)

    // Generate access token for the WebSDK
    const { token } = await generateAccessToken(normalizedAddress)

    return res.status(200).json({
      token,
      userId: normalizedAddress
    })
  } catch (error) {
    console.error('Error generating Sumsub access token:', error)
    return res.status(500).json({
      error: 'Token generation failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
}
