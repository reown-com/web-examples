import { ErrorResponse, FillUserOpResponse } from '@/lib/smart-accounts/builders/UserOpBuilder'
import { getChainById } from '@/utils/ChainUtil'
import { getUserOpBuilder } from '@/utils/UserOpBuilderUtil'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FillUserOpResponse | ErrorResponse>
) {
  const chainId = req.body.chainId
  const account = req.body.account
  const chain = getChainById(chainId)
  try {
    const builder = await getUserOpBuilder({
      account,
      chain
    })

    const response = await builder.fillUserOp(req.body)

    res.status(200).json(response)
  } catch (error: any) {
    return res.status(200).json({
      message: 'Unable to build userOp',
      error: error.message
    })
  }
}
