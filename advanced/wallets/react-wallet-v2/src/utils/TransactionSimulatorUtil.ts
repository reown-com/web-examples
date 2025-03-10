import { providers } from 'ethers'

const TransactionSimulatorUtil = {
  simulateAndCheckERC20Transfer: async (
    chainId: string,
    fromWalletAddress: string,
    calls: { to: string; value: string; data: string }[]
  ) => {
    const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || ''
    const provider = new providers.JsonRpcProvider(
      `https://rpc.walletconnect.org/v1?chainId=eip155:${chainId}&projectId=${projectId}`
    )
    const result = await provider.send('eth_call', [
      {
        to: calls[0].to,
        from: fromWalletAddress,
        value: '0x0',
        data: calls[0].data
      },
      'latest'
    ])

    return result
  }
}

export default TransactionSimulatorUtil
