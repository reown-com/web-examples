import ModalStore from '@/store/ModalStore'
import LegacySessionProposalModal from '@/views/LegacySessionProposalModal'
import LegacySessionSendTransactionModal from '@/views/LegacySessionSendTransactionModal'
import LegacySessionSignModal from '@/views/LegacySessionSignModal'
import LegacySessionSignTypedDataModal from '@/views/LegacySessionSignTypedDataModal'
import SessionProposalModal from '@/views/SessionProposalModal'
import SessionSendTransactionModal from '@/views/SessionSendTransactionModal'
import SessionRequestModal from '@/views/SessionSignModal'
import SessionSignTypedDataModal from '@/views/SessionSignTypedDataModal'
import SessionUnsuportedMethodModal from '@/views/SessionUnsuportedMethodModal'
import { Modal as NextModal } from '@nextui-org/react'
import { useSnapshot } from 'valtio'

export default function Modal() {
  const { open, view } = useSnapshot(ModalStore.state)

  return (
    <NextModal blur open={open} style={{ border: '1px solid rgba(139, 139, 139, 0.4)' }}>
      {view === 'SessionProposalModal' && <SessionProposalModal />}
      {view === 'SessionSignModal' && <SessionRequestModal />}
      {view === 'SessionSignTypedDataModal' && <SessionSignTypedDataModal />}
      {view === 'SessionSendTransactionModal' && <SessionSendTransactionModal />}
      {view === 'SessionUnsuportedMethodModal' && <SessionUnsuportedMethodModal />}
      {view === 'LegacySessionProposalModal' && <LegacySessionProposalModal />}
      {view === 'LegacySessionSignModal' && <LegacySessionSignModal />}
      {view === 'LegacySessionSignTypedDataModal' && <LegacySessionSignTypedDataModal />}
      {view === 'LegacySessionSendTransactionModal' && <LegacySessionSendTransactionModal />}
    </NextModal>
  )
}
