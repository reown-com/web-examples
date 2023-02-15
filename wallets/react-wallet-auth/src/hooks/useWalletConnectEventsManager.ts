import { EIP155_SIGNING_METHODS } from '@/data/EIP155Data'
import ModalStore from '@/store/ModalStore'
import { authClient } from '@/utils/WalletConnectUtil'
import { useCallback, useEffect } from 'react'

export default function useWalletConnectEventsManager(initialized: boolean) {
  /******************************************************************************
   * Set up WalletConnect event listeners
   *****************************************************************************/
  useEffect(() => {
    if (initialized) {
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
  }, [initialized])
}
