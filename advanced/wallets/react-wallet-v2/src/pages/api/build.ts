import {
  ErrorResponse,
  PrepareCallsParams,
  PrepareCallsReturnValue
} from '@/lib/smart-accounts/builders/UserOpBuilder'
import { getChainById } from '@/utils/ChainUtil'
import { getUserOpBuilder } from '@/utils/UserOpBuilderUtil'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PrepareCallsReturnValue | ErrorResponse>
) {
  const data = req.body as PrepareCallsParams
  const chainId = parseInt(data.chainId, 16)
  const account = data.from
  const chain = getChainById(chainId)
  try {
    const builder = await getUserOpBuilder({
      account,
      chain
    })

    const response = await builder.prepareCalls(data)

    res.status(200).json(response)
  } catch (error: any) {
    return res.status(200).json({
      message: 'Unable to prepare calls',
      error: error.message
    })
  }
}
