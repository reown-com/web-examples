import { Core } from '@walletconnect/core'
import { ICore } from '@walletconnect/types'
import { Web3Wallet, IWeb3Wallet } from '@walletconnect/web3wallet'
export let web3wallet: IWeb3Wallet
export let core: ICore

export async function createWeb3Wallet(relayerRegionURL: string) {
  core = new Core({
    logger: 'debug',
    projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
    relayUrl: relayerRegionURL ?? process.env.NEXT_PUBLIC_RELAY_URL
  })

  web3wallet = await Web3Wallet.init({
    core,
    metadata: {
      name: 'React Web3Wallet',
      description: 'React Web3Wallet for WalletConnect',
      url: 'https://walletconnect.com/',
      icons: ['https://avatars.githubusercontent.com/u/37784886']
    }
  })
}

export async function pair(params: { uri: string }) {
  return await core.pairing.pair({ uri: params.uri })
}
