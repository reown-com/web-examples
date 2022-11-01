import SignClient from '@walletconnect/sign-client'
import LegacySignClient from '@walletconnect/client'
import ModalStore from '@/store/ModalStore'

export let signClient: SignClient
export let legacySignClient: LegacySignClient

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

export function createLegacySignClient({ uri }: { uri: string }) {
  legacySignClient = new LegacySignClient({ uri })
  console.log('legacySignClient: ', legacySignClient)

  console.log('BIND LEGACY LISTENERS')

  legacySignClient.on('session_request', (error, payload) => {
    if (error) {
      throw new Error(`legacySignClient > session_request failed: ${error}`)
    }

    console.log('legacySignClient > session_request:', payload)
    ModalStore.open('LegacySessionProposalModal', { legacyProposal: payload })
  })

  legacySignClient.on('connect', () => {
    console.log('legacySignClient > connect')
  })

  // legacySignClient.on('disconnect', () => disconnect())

  legacySignClient.on('error', error => {
    throw new Error(`legacySignClient > on error: ${error}`)
  })
  legacySignClient.on('call_request', (error, payload) => {
    if (error) {
      throw new Error(`legacySignClient > call_request failed: ${error}`)
    }

    // handleCallRequest(payload)
  })

  // legacySignClient.on('session_request', (error, payload) => {
  //   if (error) {
  //     throw error
  //   }

  //   console.log('session_request:', payload)

  //   legacySignClient.approveSession({
  //     accounts: [
  //       // required
  //       '0xa34Bf1DF3DB9844b9Ed48a1E16d984afba7d1b8C'
  //     ],
  //     chainId: 1 // required
  //   })
  // })
}
