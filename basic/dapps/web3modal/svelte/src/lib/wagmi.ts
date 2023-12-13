import { getAccount, getNetwork, watchAccount, watchNetwork } from "@wagmi/core"
import { readable } from "svelte/store"

import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi'

import { mainnet, arbitrum } from 'viem/chains'

export const projectId = 'cdbd18f9f96172be74c3e351ce99b908'

const metadata = {
  name: 'Web3Modal',
  description: 'Web3Modal Example',
  url: 'https://web3modal.com',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

export const chains = [mainnet, arbitrum]
export const wagmiConfig = defaultWagmiConfig({ chains, projectId, metadata })

createWeb3Modal({ wagmiConfig, projectId, chains, themeMode: 'dark' })

export const network = readable(getNetwork(), (set)=>watchNetwork(set))
export const account = readable(getAccount(), (set)=>watchAccount(set))

