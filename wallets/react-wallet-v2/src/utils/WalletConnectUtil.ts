import SignClient from '@walletconnect/sign-client'

export let signClient: SignClient

export async function createSignClient(relayerRegionURL: string) {
  signClient = await SignClient.init({
    logger: 'debug',
    projectId: '3aad49d31f1fd2fcbc6b3b066e08fccc',
    relayUrl: 'wss://relay.walletconnect.com',
    metadata: {
      name: 'React Wallet',
      description: 'React Wallet for WalletConnect',
      url: 'https://walletconnect.com/',
      icons: ['https://avatars.githubusercontent.com/u/37784886']
    }
  })
}
