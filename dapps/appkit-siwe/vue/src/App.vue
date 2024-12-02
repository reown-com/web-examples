<script lang="ts" setup>
import { createAppKit } from '@reown/appkit/vue'
import { arbitrum, mainnet, type AppKitNetwork } from '@reown/appkit/networks'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'

import { createSIWE  } from './utils/siweUtils'

// 1. Get projectId at https://cloud.reown.com
const projectId = import.meta.env.VITE_PROJECT_ID;
if (!projectId) throw new Error("Project ID is undefined");

// 2. Create metadata
const metadata = {
  name: "AppKit SIWE",
  description: "AppKit SIWE Example",
  url: "https://reown.com",
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

// 3. Set the networks
const chains: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet, arbitrum];

// 4. Create Wagmi Adapter
const wagmiAdapter = new WagmiAdapter({
  networks: chains,
  projectId,
  ssr: true
});

// 5. Create a SIWE configuration object
const siweConfig = createSIWE(chains);


// 6. Create modal
const modal = createAppKit({
  adapters: [wagmiAdapter],
  networks: chains,
  projectId,
  siweConfig,
  metadata,
  features: {
    email: true, // default to true
    socials: ['google', 'x', 'github', 'discord', 'apple', 'facebook', 'farcaster'],
    emailShowWallets: true, // default to true
  }
});
</script>

<template>
  <div>
    <button @click="modal.open">Open Modal</button>
  </div>
</template>