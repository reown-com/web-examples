import LegacySignClient from '@walletconnect/client'
import { ISessionParams } from '@walletconnect/legacy-types'
import ModalStore from '@/store/ModalStore'
import { EIP155_SIGNING_METHODS } from '@/data/EIP155Data'

export let legacySignClient: LegacySignClient

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

    console.log('legacySignClient > call_request: ', payload)

    // handleCallRequest(payload)
  })
}

// const onCallRequest = async (payload: { id: number; method: string; params: any[] }) => {
//   const { topic, params } = payload
//   const { request } = params
//   // const requestSession = signClient.session.get(topic)

//   switch (request.method) {
//     case EIP155_SIGNING_METHODS.ETH_SIGN:
//     case EIP155_SIGNING_METHODS.PERSONAL_SIGN:
//       return ModalStore.open('SessionSignModal', { requestEvent, requestSession })

//     case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA:
//     case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3:
//     case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4:
//       return ModalStore.open('SessionSignTypedDataModal', { requestEvent, requestSession })

//     case EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION:
//     case EIP155_SIGNING_METHODS.ETH_SIGN_TRANSACTION:
//       return ModalStore.open('SessionSendTransactionModal', { requestEvent, requestSession })

//     default:
//       return ModalStore.open('SessionUnsuportedMethodModal', { requestEvent, requestSession })
//   }
// }
