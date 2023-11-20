import {
  createPimlicoBundlerClient,
  createPimlicoPaymasterClient
} from 'permissionless/clients/pimlico'
import { createPublicClient, http } from 'viem'

const projectId = process.env.NEXT_PUBLIC_PROJECT_ID
const pimlicoKey = process.env.NEXT_PUBLIC_PIMLICO_KEY

export const pimlicoBundlerTransport = http(
  `https://api.pimlico.io/v1/sepolia/rpc?apikey=${pimlicoKey}`
)

export const publicClient = createPublicClient({
  transport: http(
    `https://rpc.walletconnect.com/v1/?chainId=EIP155:11155111&projectId=${projectId}`
  )
})

export const bundlerClient = createPimlicoBundlerClient({
  transport: pimlicoBundlerTransport
})

export const paymasterClient = createPimlicoPaymasterClient({
  transport: http(`https://api.pimlico.io/v2/sepolia/rpc?apikey=${pimlicoKey}`)
})
