import { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'

const SUMSUB_APP_TOKEN = process.env.NEXT_PUBLIC_SUMSUB_APP_TOKEN || ''
const SUMSUB_SECRET_KEY = process.env.NEXT_PUBLIC_SUMSUB_SECRET_KEY || ''
process.env.SUMSUB_APP_TOKEN = SUMSUB_APP_TOKEN
process.env.SUMSUB_SECRET_KEY = SUMSUB_SECRET_KEY
const SUMSUB_BASE_URL = 'https://api.sumsub.com'

export type KycStatus = 'none' | 'pending' | 'approved' | 'rejected'

interface StatusResponse {
  status: KycStatus
  reviewResult?: {
    reviewAnswer?: string
    rejectLabels?: string[]
    reviewRejectType?: string
  }
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
 * Gets applicant status from Sumsub
 */
async function getApplicantStatus(externalUserId: string): Promise<StatusResponse> {
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

  // If applicant doesn't exist, return 'none' status
  if (response.status === 404) {
    return { status: 'none' }
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to get applicant status: ${errorText}`)
  }

  const data = await response.json()

  // Map Sumsub review status to our KycStatus
  // Sumsub statuses: init, pending, prechecked, queued, completed, onHold
  // Review answers: GREEN (approved), RED (rejected), YELLOW (needs review)

  const reviewStatus = data.review?.reviewStatus
  const reviewAnswer = data.review?.reviewResult?.reviewAnswer

  let status: KycStatus = 'none'

  if (!reviewStatus || reviewStatus === 'init') {
    status = 'none'
  } else if (reviewAnswer === 'GREEN') {
    status = 'approved'
  } else if (reviewAnswer === 'RED') {
    status = 'rejected'
  } else {
    // pending, prechecked, queued, onHold, or completed without clear answer
    status = 'pending'
  }

  return {
    status,
    reviewResult: data.review?.reviewResult
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatusResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res
      .status(405)
      .json({ error: 'Method not allowed', message: 'Only GET requests are accepted' })
  }

  // Check if Sumsub credentials are configured
  if (!SUMSUB_APP_TOKEN || !SUMSUB_SECRET_KEY) {
    return res.status(500).json({
      error: 'Configuration error',
      message:
        'Sumsub credentials are not configured. Please set NEXT_PUBLIC_SUMSUB_APP_TOKEN and NEXT_PUBLIC_SUMSUB_SECRET_KEY environment variables.'
    })
  }

  const { address } = req.query

  if (!address || typeof address !== 'string') {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'Ethereum address is required as query parameter'
    })
  }

  // Normalize address to lowercase for consistency
  const normalizedAddress = address.toLowerCase()

  try {
    const statusResponse = await getApplicantStatus(normalizedAddress)
    return res.status(200).json(statusResponse)
  } catch (error) {
    console.error('Error getting KYC status:', error)
    return res.status(500).json({
      error: 'Status check failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
}
