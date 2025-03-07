import { Network, Tenderly } from '@tenderly/sdk'
import { providers } from 'ethers'

const TransactionSimulatorUtil = {
  state: {
    clients: {} as Record<number, Tenderly>
  },
  getTenderlyClient: (chainId: number) => {
    const accountSlug = process.env.NEXT_PUBLIC_TENDERLY_ACCOUNT_SLUG || ''
    const projectSlug = process.env.NEXT_PUBLIC_TENDERLY_PROJECT_SLUG || ''
    const apiKey = process.env.NEXT_PUBLIC_TENDERLY_API_KEY || ''
    console.log(accountSlug, projectSlug, apiKey)
    if (!TransactionSimulatorUtil.state.clients[chainId]) {
      TransactionSimulatorUtil.state.clients[chainId] = new Tenderly({
        accountName: accountSlug,
        projectName: projectSlug,
        accessKey: apiKey,
        network: chainId as Network
      })
    }
    return TransactionSimulatorUtil.state.clients[chainId]
  },

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

    // const chainIdNumber = parseInt(chainId)
    // const client = TransactionSimulatorUtil.getTenderlyClient(chainIdNumber)
    // const simulations = await client.simulator.simulateBundle({
    //   transactions: calls.map(call => ({
    //     from: fromWalletAddress,
    //     to: call.to,
    //     value: call.value,
    //     input:call.data,
    //   } as any)),
    //   blockNumber: 27240854,
    // });
    // return simulations
  }
}

export default TransactionSimulatorUtil
