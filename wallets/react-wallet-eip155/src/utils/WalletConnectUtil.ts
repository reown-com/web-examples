import SettingsStore from '@/store/SettingsStore'
import { Core } from '@walletconnect/core'
import { Web3Wallet } from '@walletconnect/web3wallet'

export let web3wallet: InstanceType<typeof Web3Wallet>
export let core: InstanceType<typeof Core>

export async function createWeb3Wallet() {
  if (!SettingsStore.state.web3WalletReady && typeof window !== 'undefined') {
    core = new Core({
      projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
      logger: 'debug'
    })

    web3wallet = await Web3Wallet.init({
      core,
      metadata: {
        name: 'React Wallet',
        description: 'React Wallet for WalletConnect',
        url: 'https://walletconnect.com/',
        icons: ['https://avatars.githubusercontent.com/u/37784886']
      }
    })

    SettingsStore.setWeb3WalletReady(true)
  }
}
