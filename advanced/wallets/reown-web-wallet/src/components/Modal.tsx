import ModalStore from '@/store/ModalStore'
import SessionProposalModal from '@/views/SessionProposalModal'
import SessionSendTransactionModal from '@/views/SessionSendTransactionModal'
import SessionRequestModal from '@/views/SessionSignModal'

import SessionSignTypedDataModal from '@/views/SessionSignTypedDataModal'
import SessionUnsuportedMethodModal from '@/views/SessionUnsuportedMethodModal'
import { Modal as NextModal } from '@nextui-org/react'
import { useSnapshot } from 'valtio'
import { useCallback, useMemo } from 'react'
import AuthRequestModal from '@/views/AuthRequestModal'
import LoadingModal from '@/views/LoadingModal'
import SessionAuthenticateModal from '@/views/SessionAuthenticateModal'
import AppKitConnectionModal from '@/views/AppKitConnectionModal'

export default function Modal() {
  const { open, view } = useSnapshot(ModalStore.state)
  // handle the modal being closed by click outside
  const onClose = useCallback(() => {
    if (open) {
      ModalStore.close()
    }
  }, [open])

  const componentView = useMemo(() => {
    switch (view) {
      case 'SessionProposalModal':
        return <SessionProposalModal />
      case 'SessionSignModal':
        return <SessionRequestModal />
      case 'SessionSignTypedDataModal':
        return <SessionSignTypedDataModal />
      case 'SessionSendTransactionModal':
        return <SessionSendTransactionModal />
      case 'SessionUnsuportedMethodModal':
        return <SessionUnsuportedMethodModal />
      case 'AuthRequestModal':
        return <AuthRequestModal />
      case 'LoadingModal':
        return <LoadingModal />
      case 'SessionAuthenticateModal':
        return <SessionAuthenticateModal />
      case 'AppKitConnectionModal':
        return <AppKitConnectionModal />
      default:
        return null
    }
  }, [view])

  return (
    <NextModal
      blur
      onClose={onClose}
      open={open}
      style={{ border: '1px solid rgba(139, 139, 139, 0.4)' }}
    >
      {componentView}
    </NextModal>
  )
}
