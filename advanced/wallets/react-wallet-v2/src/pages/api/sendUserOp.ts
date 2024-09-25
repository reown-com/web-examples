import {
  ErrorResponse,
  SendUserOpResponseReturn
} from '@/lib/smart-accounts/builders/UserOpBuilder'
import { getChainById } from '@/utils/ChainUtil'
import { getUserOpBuilder } from '@/utils/UserOpBuilderUtil'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SendUserOpResponseReturn | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      message: 'Method not allowed',
      error: 'Method not allowed'
    })
  }
  if (!req.body.chainId) {
    return res.status(400).json({
      message: 'chainId is required',
      error: 'chainId is required'
    })
  }
  if (!req.body.userOp) {
    return res.status(400).json({
      message: 'userOp is required',
      error: 'userOp is required'
    })
  }
  if (
    req.query.projectId === undefined ||
    req.query.projectId === '' ||
    typeof req.query.projectId !== 'string'
  ) {
    return res.status(400).json({
      message: 'invalid projectId',
      error: 'invalid projectId'
    })
  }
  const projectId = req.query.projectId
  const chainId = req.body.chainId
  const account = req.body.userOp.sender
  const chain = getChainById(chainId)
  try {
    const builder = await getUserOpBuilder({
      account,
      chain
    })
    const response = await builder.sendUserOpWithSignature(projectId, req.body)

    res.status(200).json(response)
  } catch (error: any) {
    return res.status(200).json({
      message: 'Unable to send userOp',
      error: error.message
    })
  }
}
