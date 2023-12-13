import ModalStore from '@/store/ModalStore'
import SessionProposalModal from '@/views/SessionProposalModal'
import SessionSendTransactionModal from '@/views/SessionSendTransactionModal'
import SessionSignCosmosModal from '@/views/SessionSignCosmosModal'
import SessionRequestModal from '@/views/SessionSignModal'
import SessionSignNearModal from '@/views/SessionSignNearModal'
import SessionSignPolkadotModal from '@/views/SessionSignPolkadotModal'
import SessionSignSolanaModal from '@/views/SessionSignSolanaModal'
import SessionSignMultiversxModal from '@/views/SessionSignMultiversxModal'
import SessionSignTronModal from '@/views/SessionSignTronModal'
import SessionSignTezosModal from '@/views/SessionSignTezosModal'
import SessionSignKadenaModal from '@/views/SessionSignKadenaModal'
import SessionSignTypedDataModal from '@/views/SessionSignTypedDataModal'
import SessionUnsuportedMethodModal from '@/views/SessionUnsuportedMethodModal'
import { Modal as NextModal } from '@nextui-org/react'
import { useSnapshot } from 'valtio'
import { useCallback } from 'react'
import AuthRequestModal from '@/views/AuthRequestModal'

export default function Modal() {
  const { open, view } = useSnapshot(ModalStore.state)
  // handle the modal being closed by click outside
  const onClose = useCallback(() => {
    if (open) {
      ModalStore.close()
    }
  }, [open])

  return (
    <NextModal
      blur
      onClose={onClose}
      open={open}
      style={{ border: '1px solid rgba(139, 139, 139, 0.4)' }}
    >
      {view === 'SessionProposalModal' && <SessionProposalModal />}
      {view === 'SessionSignModal' && <SessionRequestModal />}
      {view === 'SessionSignTypedDataModal' && <SessionSignTypedDataModal />}
      {view === 'SessionSendTransactionModal' && <SessionSendTransactionModal />}
      {view === 'SessionUnsuportedMethodModal' && <SessionUnsuportedMethodModal />}
      {view === 'SessionSignCosmosModal' && <SessionSignCosmosModal />}
      {view === 'SessionSignSolanaModal' && <SessionSignSolanaModal />}
      {view === 'SessionSignPolkadotModal' && <SessionSignPolkadotModal />}
      {view === 'SessionSignNearModal' && <SessionSignNearModal />}
      {view === 'SessionSignMultiversxModal' && <SessionSignMultiversxModal />}
      {view === 'SessionSignTronModal' && <SessionSignTronModal />}
      {view === 'SessionSignTezosModal' && <SessionSignTezosModal />}
      {view === 'SessionSignKadenaModal' && <SessionSignKadenaModal />}
      {view === 'AuthRequestModal' && <AuthRequestModal />}
    </NextModal>
  )
}
