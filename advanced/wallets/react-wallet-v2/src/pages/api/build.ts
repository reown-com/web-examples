import { SafeUserOpBuilder } from '@/lib/smart-accounts/builders/SafeUserOpBuilder'
import { ErrorResponse, FillUserOpResponse, getAccountImplementation, ImplementationType, UserOpBuilder } from '@/lib/smart-accounts/builders/UserOpBuilder'
import { getChainById } from '@/utils/ChainUtil'
import { NextApiRequest, NextApiResponse } from 'next'


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FillUserOpResponse | ErrorResponse>
) {
  const chainId = req.body.chainId
  const account = req.body.account
  const chain = getChainById(chainId)
  try {
    const accountImplementation = await getAccountImplementation({
      account,
      chain,
    })

    let builder: UserOpBuilder

    switch (accountImplementation.type) {
      case ImplementationType.Safe:
        builder = new SafeUserOpBuilder(account, chainId)
        break;
    }

    const response = await builder.fillUserOp(req.body)

    res.status(200).json(response)
  } catch (error: any) {
    return res.status(200).json({
      message: 'Unable to build userOp',
      error: error.message
    })
  }

  
}
