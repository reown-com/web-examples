import SignClient from '@walletconnect/sign-client'
import { getFullChainName } from './HelperUtil'
export let signClient: SignClient

export async function createSignClient(relayerRegionURL: string) {
  signClient = await SignClient.init({
    logger: 'debug',
    projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
    relayUrl: relayerRegionURL ?? process.env.NEXT_PUBLIC_RELAY_URL,
    metadata: {
      name: 'React Wallet',
      description: 'React Wallet for WalletConnect',
      url: 'https://walletconnect.com/',
      icons: ['https://avatars.githubusercontent.com/u/37784886']
    }
  })
}

export async function updateSignClientChainId(chainId: string, address: string) {
  const sessions = signClient.session.getAll()
  for (const session of sessions) {
    const fullChainName = getFullChainName(chainId)
    const chain = fullChainName.substring(0, fullChainName.indexOf(':'))
    const accounts = session.namespaces[chain] ? session.namespaces[chain].accounts : []
    const new_account = `${fullChainName}:${address}`

    // ensures no dup namespace accounts get added
    if (!accounts.includes(new_account)) {
      accounts.push(new_account)
    }

    const newNamespace = {
      [chain]: {
        accounts: accounts,
        methods: [
          'eth_sendTransaction',
          'eth_signTransaction',
          'eth_sign',
          'personal_sign',
          'eth_signTypedData'
        ],
        events: ['chainChanged', 'accountsChanged']
      }
    }

    // console.log(session.namespaces ? { ...session.namespaces, ...newNamespace } : newNamespace)

    signClient.update({
      topic: session.topic,
      namespaces: session.namespaces ? { ...session.namespaces, ...newNamespace } : newNamespace
    })
  }
}
