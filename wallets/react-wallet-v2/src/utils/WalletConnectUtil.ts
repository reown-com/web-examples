import { Web3Wallet, IWeb3Wallet } from '@walletconnect/web3wallet'
import { Core } from '@walletconnect/core'
import { eip155Wallets } from './EIP155WalletUtil'
import { buildAuthObject } from '@walletconnect/utils'
export let web3wallet: IWeb3Wallet

export async function createWeb3Wallet(relayerRegionURL: string) {
  const core = new Core({
    projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
    relayUrl: relayerRegionURL ?? process.env.NEXT_PUBLIC_RELAY_URL
  })
  web3wallet = await Web3Wallet.init({
    core,
    metadata: {
      name: 'React Wallet Example',
      description: 'React Wallet for WalletConnect',
      url: 'https://walletconnect.com/',
      icons: ['https://avatars.githubusercontent.com/u/37784886']
    }
  })
  let cryptoWallet = eip155Wallets[Object.keys(eip155Wallets)[0]]
  let address = Object.keys(eip155Wallets)[0]
  console.log('cryptoWallet', cryptoWallet, address)

  // web3wallet.engine.signClient.events.on('session_authenticate', async payload => {
  //   console.log('session_authenticate', payload)

  //   const auths = []
  //   payload.params.authPayload.chains.forEach(async chain => {
  //     console.log('cacaos', JSON.stringify(payload.params.authPayload))

  //     const message = web3wallet.engine.signClient.formatAuthMessage({
  //       request: payload.params.authPayload,
  //       iss: `did:pkh:${chain}:${address}`
  //     })

  //     const sig = await cryptoWallet.signMessage(message)
  //     console.log('chain', chain, message, sig)
  //     const auth = buildAuthObject(
  //       payload.params.authPayload,
  //       {
  //         t: 'eip191',
  //         s: sig
  //       },
  //       `did:pkh:${chain}:${address}`
  //     )
  //     console.log('auth', auth)
  //     auths.push(auth)
  //   })

  //   await web3wallet.engine.signClient.approveSessionAuthenticate({
  //     id: payload.id,
  //     auths
  //   })
  //   console.log('wallet session_authenticate approved')
  // })
  try {
    const clientId = await web3wallet.engine.signClient.core.crypto.getClientId()
    console.log('WalletConnect ClientID: ', clientId)
    localStorage.setItem('WALLETCONNECT_CLIENT_ID', clientId)
  } catch (error) {
    console.error('Failed to set WalletConnect clientId in localStorage: ', error)
  }
}

export async function updateSignClientChainId(chainId: string, address: string) {
  console.log('chainId', chainId, address)
  // get most recent session
  const sessions = web3wallet.getActiveSessions()
  if (!sessions) return
  const namespace = chainId.split(':')[0]
  Object.values(sessions).forEach(async session => {
    await web3wallet.updateSession({
      topic: session.topic,
      namespaces: {
        ...session.namespaces,
        [namespace]: {
          ...session.namespaces[namespace],
          chains: [
            ...new Set([chainId].concat(Array.from(session.namespaces[namespace].chains || [])))
          ],
          accounts: [
            ...new Set(
              [`${chainId}:${address}`].concat(Array.from(session.namespaces[namespace].accounts))
            )
          ]
        }
      }
    })
    await new Promise(resolve => setTimeout(resolve, 1000))

    const chainChanged = {
      topic: session.topic,
      event: {
        name: 'chainChanged',
        data: parseInt(chainId.split(':')[1])
      },
      chainId: chainId
    }

    const accountsChanged = {
      topic: session.topic,
      event: {
        name: 'accountsChanged',
        data: [`${chainId}:${address}`]
      },
      chainId
    }
    await web3wallet.emitSessionEvent(chainChanged)
    await web3wallet.emitSessionEvent(accountsChanged)
  })
}
