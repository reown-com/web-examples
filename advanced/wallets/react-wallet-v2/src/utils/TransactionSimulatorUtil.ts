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
    await Promise.all(calls.map(async (call) => {
      const result = await provider.send('eth_call', [
        {
          to: call.to,
          from: fromWalletAddress,
          value: '0x0',
          data: call.data
      },
      'latest'
    ])
    const gasEstimate = await provider.send('eth_estimateGas', [
      {
        to: call.to,
        from: fromWalletAddress,
        value: '0x0',
        data: call.data
    },
    'latest'
  ])
  console.log('gasEstimate', gasEstimate)
      return result
    }))
  },
  simulateAndCheckNativeTransfer: async (
    chainId: string,
    fromWalletAddress: string,
    calls: { to: string; value: string; }[]
  ) => {
    const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || ''
    const provider = new providers.JsonRpcProvider(
      `https://rpc.walletconnect.org/v1?chainId=eip155:${chainId}&projectId=${projectId}`
    )
    await Promise.all(calls.map(async (call) => {
      const result = await provider.send('eth_call', [
        {
          to: call.to,
          from: fromWalletAddress,
          value: call.value,
          data: '0x'
        },
        'latest'
      ])
      const gasEstimate = await provider.send('eth_estimateGas', [
        {
          to: call.to,
          from: fromWalletAddress,
          value: call.value,
          data: '0x'
        },
        'latest'
      ])
      console.log('gasEstimate', gasEstimate)
      console.log('result', result)
    }))
  }
}

export default TransactionSimulatorUtil
