import { createPimlicoBundlerClient } from 'permissionless/clients/pimlico'
import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'

const projectId = process.env.NEXT_PUBLIC_PROJECT_ID
const pimlicoKey = process.env.NEXT_PUBLIC_PIMLICO_KEY

export const pimlicoBundlerTransport = http(
  `https://api.pimlico.io/v1/sepolia/rpc?apikey=${pimlicoKey}`
)

export const walletConnectTransport = http(
  `https://rpc.walletconnect.com/v1/?chainId=EIP155:11155111&projectId=${projectId}`
)

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: walletConnectTransport
})

export const bundlerClient = createPimlicoBundlerClient({
  chain: sepolia,
  transport: pimlicoBundlerTransport
})
