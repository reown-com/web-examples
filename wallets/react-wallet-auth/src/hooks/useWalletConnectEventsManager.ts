import ModalStore from '@/store/ModalStore'
import { authClient, pushClient } from '@/utils/WalletConnectUtil'
import { useEffect } from 'react'

export default function useWalletConnectEventsManager(initialized: boolean) {
  /******************************************************************************
   * Set up WalletConnect event listeners
   *****************************************************************************/
  useEffect(() => {
    if (initialized) {
      // Auth client events
      authClient.on('auth_request', ({ id, params }) => {
        console.log('auth_request', { id, params })
        ModalStore.open('AuthenticationRequest', {
          authenticationRequest: {
            id,
            params
          }
        })
      })
    }

    if (pushClient) {
      // Push client events
      pushClient.on('push_proposal', async ({ id, topic, params }) => {
        console.log('push_proposal', { id, topic, params })
        ModalStore.open('PushRequest', {
          pushRequest: {
            id,
            topic,
            params
          }
        })
      })
    }
  }, [initialized])
}
