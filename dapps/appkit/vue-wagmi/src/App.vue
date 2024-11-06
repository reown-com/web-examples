
<template>
  <div class="app-container">
    <h1>AppKit Wagmi Vue Example</h1>

    <!-- AppKit UI Components -->
    <div class="button-group">
      <w3m-button />
      <w3m-network-button />
    </div>
    <br />
    <!-- Modal Controls -->
    <div class="button-group">
        <button @click="modal.open()">Open Connect Modal</button>
        <button @click="modal.open({ view: 'Networks' })">Open Network Modal</button>
        <button @click="disconnect()">Disconnect</button>
        <button @click="toggleTheme">Toggle Theme Mode</button>
    </div>

     <!-- State Displays -->
     <div class="button-group">
      <textarea rows="10" cols="50">
Account
{{ JSON.stringify(accountState, null, 2) }}


Network
{{ JSON.stringify(networkState, null, 2) }}


State
{{ JSON.stringify(appState, null, 2) }}


Theme
{{ JSON.stringify(themeState, null, 2) }}


Events
{{ JSON.stringify(events, null, 2) }}

        
Wallet Info
{{ JSON.stringify(walletInfo, null, 2) }}

wagmiAccount
{{ JSON.stringify(wagmiAccount, null, 2) }}
      </textarea>
    
    </div>
  </div>


   
</template>


<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useAccount } from '@wagmi/vue'
import {
  createAppKit,
  useAppKitState,
  useAppKitTheme,
  useAppKitEvents,
  useDisconnect
} from '@reown/appkit/vue'

import { wagmiAdapter, networks, projectId } from './config'


// Initialize AppKit
const modal = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: 'AppKit Vue Example',
    description: 'AppKit Vue Example',
    url: 'https://reown.com/appkit',
    icons: ['https://avatars.githubusercontent.com/u/179229932?s=200&v=4']
  }
})

// State Management
const accountState = ref({})
const networkState = ref({})
const appState = useAppKitState()
const { setThemeMode } = useAppKitTheme()
const events = useAppKitEvents()
const { disconnect } = useDisconnect()
const walletInfo = ref({})
import type { ThemeMode } from '@reown/appkit/vue'

const themeState = ref<{ themeMode: ThemeMode }>({ themeMode: 'light' })

// Setup hooks
const wagmiAccount = useAccount()

// Theme toggle function
const toggleTheme = () => {
  const newTheme = themeState.value.themeMode === 'dark' ? 'light' : 'dark'
  setThemeMode(newTheme)
  themeState.value.themeMode = newTheme
  document.body.className = newTheme
}

// Subscriptions
onMounted(() => {
  // Set initial theme
  document.body.className = themeState.value.themeMode
  setThemeMode(themeState.value.themeMode)

  // Setup subscriptions
  modal.subscribeAccount(state => {
    accountState.value = state
  })

  modal.subscribeNetwork(state => {
    networkState.value = state
  })

  modal.subscribeTheme(state => {
    themeState.value = state
    document.body.className = state.themeMode
  })

  modal.subscribeWalletInfo(state => {
    // @ts-ignore
    walletInfo.value = state
  })
})
</script>


<style>
/* Container Styling */
.app-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh; /* Ensures full viewport height for vertical centering */
  padding: 20px;
  color: #333;
  text-align: center;
}

/* Title Styling */
h1 {
  font-size: 2rem;
  font-weight: 600;
  color: #222;
  margin-bottom: 1.5rem;
}

/* Button Group Styling */
.button-group {
  display: flex;
  gap: 15px;
  margin-bottom: 1rem;
}

</style>