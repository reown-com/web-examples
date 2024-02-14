import { Hex, createPublicClient, encodeFunctionData, http } from "viem"
import { sepolia, polygon } from 'viem/chains'

const apiKey = process.env.NEXT_PUBLIC_PIMLICO_KEY

// Types
export const allowedChains = [sepolia, polygon] as const
// build chains so I can access them by id
export const chains = allowedChains.reduce((acc, chain) => {
  acc[chain.id] = chain
  return acc
}, {} as Record<Chain['id'], Chain>)
export type Chain = (typeof allowedChains)[number]
export type UrlConfig = {
  chain: Chain
}

// Entrypoints [I think this is constant but JIC]
export const ENTRYPOINT_ADDRESSES: Record<Chain['name'], Hex> = {
  Sepolia: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  Polygon: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
}

// Paymasters
// https://docs.pimlico.io/paymaster/erc20-paymaster/contract-addresses
export const PAYMASTER_ADDRESSES: Record<Chain['name'], Hex> = {
  Sepolia: '0x0000000000325602a77416A16136FDafd04b299f',
  Polygon: '0xa683b47e447De6c8A007d9e294e87B6Db333Eb18',
}

// USDC
export const USDC_ADDRESSES: Record<Chain['name'], Hex> = {
  Sepolia: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  Polygon: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
}

// RPC URLs
export const RPC_URLS: Record<Chain['name'], string> = {
  Sepolia: 'https://rpc.ankr.com/eth_sepolia',
  Polygon: 'https://polygon-rpc.com',
}

// Pimlico RPC names
export const PIMLICO_NETWORK_NAMES: Record<Chain['name'], string> = {
  Sepolia: 'sepolia',
  Polygon: 'polygon',
}

export const FAUCET_URLS: Record<Chain['name'], string> = {
  Sepolia: 'https://sepoliafaucet.com',
  Polygon: 'https://faucet.polygon.technology/',
}

export const USDC_FAUCET_URL = 'https://faucet.circle.com/'

export const VITALIK_ADDRESS = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045' as Hex

export const publicRPCUrl = ({ chain }: UrlConfig) => {
  return RPC_URLS[chain?.name]
}

export const paymasterUrl = ({ chain }: UrlConfig) =>
  `https://api.pimlico.io/v2/${PIMLICO_NETWORK_NAMES[chain.name]}/rpc?apikey=${apiKey}`
export const bundlerUrl = ({ chain }: UrlConfig) =>
  `https://api.pimlico.io/v1/${PIMLICO_NETWORK_NAMES[chain.name]}/rpc?apikey=${apiKey}`


const publicClient = ({ chain }: UrlConfig) => createPublicClient({
  transport: http(publicRPCUrl({ chain })),
})

export const approvePaymasterUSDCSpend = (chain: Chain) => {
  // Approve paymaster to spend USDC  on our behalf
  const approveData = approveUSDCSpendCallData({
    to: PAYMASTER_ADDRESSES[chain.name],
    amount: 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffn
  })

  // GENERATE THE CALLDATA FOR USEROP TO SEND TO THE SMART ACCOUNT
  const dest = USDC_ADDRESSES[chain.name]  // Execute tx in USDC contract
  const value = 0n
  const data = approveData // Execute approve call

  return generateUserOperationExecuteCallData({ dest, value, data })
}

export const approveUSDCSpendCallData = ({ to, amount }: { to: Hex, amount: bigint }) => {
  return encodeFunctionData({
    abi: [
        {
          inputs: [
              { name: "_spender", type: "address" },
              { name: "_value", type: "uint256" }
          ],
          name: "approve",
          outputs: [{ name: "", type: "bool" }],
          payable: false,
          stateMutability: "nonpayable",
          type: "function"
        }
    ],
    args: [to, amount]
  })
}

// Wraps the call data in the execute function in order to send via UserOperation
export const generateUserOperationExecuteCallData = ({ dest, data, value }: { dest: Hex, data: Hex, value: bigint }) => {
  return encodeFunctionData({
    abi: [
        {
            inputs: [
                { name: "dest", type: "address" },
                { name: "value", type: "uint256" },
                { name: "func", type: "bytes" }
            ],
            name: "execute",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function"
        }
    ],
    args: [dest, value, data]
  })
}
  

export const getUSDCBalance = async ({ address, chain }: { address: Hex, chain: Chain }) => {
    return publicClient({ chain }).readContract({
      abi: [
          {
            inputs: [{ name: "_owner", type: "address" }],
            name: "balanceOf",
            outputs: [{ name: "balance", type: "uint256" }],
            type: "function",
            stateMutability: "view"
          }
      ],
      address: USDC_ADDRESSES[chain.name],
      functionName: "balanceOf",
      args: [address]
  })
}