<script setup>
  import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi/vue'
  import { mainnet, arbitrum } from 'viem/chains'
  import { reconnect } from '@wagmi/core'

  // 1. Define constants
  const projectId = 'YOUR_PROJECT_ID'

  // 2. Create wagmiConfig
  const metadata = {
    name: 'Web3Modal',
    description: 'Web3Modal Example',
    url: 'https://web3modal.com', // origin must match your domain & subdomain
    icons: ['https://avatars.githubusercontent.com/u/37784886']
  }

  const chains = [mainnet, arbitrum]
  const config = defaultWagmiConfig({
    chains, // required
    projectId, // required
    metadata, // required
    enableWalletConnect: true, // Optional - true by default
    enableInjected: true, // Optional - true by default
    enableEIP6963: true, // Optional - true by default
    enableCoinbase: true // Optional - true by default
  })

  reconnect(config)
  // 3. Create modal
  createWeb3Modal({
    wagmiConfig: config,
    projectId,
    enableAnalytics: true // Optional - defaults to your Cloud configuration
  })
</script>

<template>
  <w3m-button />
</template>



