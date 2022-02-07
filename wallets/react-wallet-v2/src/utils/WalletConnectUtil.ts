import WalletConnectClient from '@walletconnect/client'

export let client: WalletConnectClient | undefined = undefined

export async function createClient() {
  client = await WalletConnectClient.init({
    controller: true,
    logger: 'debug',
    projectId: '8f331b9812e0e5b8f2da2c7203624869',
    relayUrl: 'wss://relay.walletconnect.com',
    metadata: {
      name: 'React Wallet',
      description: 'React Wallet for WalletConnect',
      url: 'https://walletconnect.com/',
      icons: ['https://avatars.githubusercontent.com/u/37784886']
    }
  })
}
