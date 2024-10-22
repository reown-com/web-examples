import { Address } from 'viem'
import { baseSepolia, sepolia } from 'viem/chains'

export const TIME_FRAME_POLICY_ADDRESSES: Record<number, Address> = {
  [baseSepolia.id]: '0x9A6c4974dcE237E01Ff35c602CA9555a3c0Fa5EF',
  [sepolia.id]: '0x6E1FCe0ec6feaD8dBD2D36a5b9eCf8e33A538479'
}

export const MULTIKEY_SIGNER_ADDRESSES: Record<number, Address> = {
  [baseSepolia.id]: '0xcaF0461410340F8F366f1F7F7716cF1D90b6bdA4',
  [sepolia.id]: '0x3cA2D7D588FA66248a49c1C885997e5017aF9Dc7'
}

export const MOCK_VALIDATOR_ADDRESSES: Record<number, Address> = {
  [baseSepolia.id]: '0x8F8842B9b7346529484F282902Af173217411076',
  [sepolia.id]: '0xaE15a31afb2770cE4c5C6131925564B03b597Fe3'
}

// All on sepolia
export const SIMPLE_SIGNER = '0x6ff7E9992160bB25f5c67b0Ce389c28d8faD3Bfb' as Address
export const MOCK_POLICY = '0xCBdFFA1e3b0bebAD9ea917910322332B2cfaeC26' as Address
export const UNI_ACTION_POLICY = '0x237C7567Ac09D4DB7Dd48852a438F77a6bd65fc4' as Address
export const USAGE_LIMIT_POLICY = '0x1f265E3beDc6ce93e1A36Dc80E1B1c65844F9861' as Address
export const VALUE_LIMIT_POLICY = '0x6F0eC0c77cCAF4c25ff8FF7113D329caAA769688' as Address

export const TRUSTED_SMART_SESSIONS_ATTERSTER_ADDRESS =
  '0xA4C777199658a41688E9488c4EcbD7a2925Cc23A' as Address
