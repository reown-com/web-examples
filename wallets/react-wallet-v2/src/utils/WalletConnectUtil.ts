import SignClient from '@walletconnect/sign-client'
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

  try {
    const clientId = await signClient.core.crypto.getClientId()
    console.log('WalletConnect ClientID: ', clientId)
    localStorage.setItem('WALLETCONNECT_CLIENT_ID', clientId)
  } catch (error) {
    console.error('Failed to set WalletConnect clientId in localStorage: ', error)
  }
}

export async function updateSignClientChainId(chainId: string, address: string) {
  // get most recent session
  const session = signClient.session.getAll()[0]
  if (!session) return

  // if chainId does not exist in session, an update is required first
  if (!session.namespaces[chainId]) {
    const newNamespace = {
      [chainId]: {
        accounts: [`${chainId}:${address}`],
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
    try {
      // need to wait for update to finish before emit
      await signClient.update({
        topic: session.topic,
        namespaces: { ...session.namespaces, ...newNamespace }
      })
    } catch (err: unknown) {
      console.error(`Failed to update session: ${err}`)
    }
  }

  const payload = {
    topic: session.topic,
    event: {
      name: 'chainChanged',
      data: [address]
    },
    chainId
  }

  try {
    signClient.emit(payload)
  } catch (err: unknown) {
    console.error(`Failed to emit chainChanged event: ${err}`)
  }
}
