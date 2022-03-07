import WalletConnectClient from '@walletconnect/client'

export let walletConnectClient: WalletConnectClient

export async function createWalletConnectClient() {
  walletConnectClient = await WalletConnectClient.init({
    controller: true,
    projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
    relayUrl: process.env.NEXT_PUBLIC_RELAY_URL ?? 'wss://relay.walletconnect.com',
    metadata: {
      name: 'React Wallet',
      description: 'React Wallet for WalletConnect',
      url: 'https://walletconnect.com/',
      icons: ['https://avatars.githubusercontent.com/u/37784886']
    }
  })
}
