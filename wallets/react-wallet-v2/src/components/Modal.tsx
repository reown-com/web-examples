import ModalStore from '@/store/ModalStore'
import SessionProposalModal from '@/views/SessionProposalModal'
import SessionSendTransactionModal from '@/views/SessionSendTransactionModal'
import SessionSignCosmosModal from '@/views/SessionSignCosmosModal'
import SessionRequestModal from '@/views/SessionSignModal'
import SessionSignNearModal from '@/views/SessionSignNearModal'
import SessionSignPolkadotModal from '@/views/SessionSignPolkadotModal'
import SessionSignSolanaModal from '@/views/SessionSignSolanaModal'
import SessionSignElrondModal from '@/views/SessionSignElrondModal'
import SessionSignTronModal from '@/views/SessionSignTronModal'
import SessionSignTypedDataModal from '@/views/SessionSignTypedDataModal'
import SessionUnsuportedMethodModal from '@/views/SessionUnsuportedMethodModal'
import LegacySessionProposalModal from '@/views/LegacySessionProposalModal'
import LegacySessionSignModal from '@/views/LegacySessionSignModal'
import LegacySessionSignTypedDataModal from '@/views/LegacySessionSignTypedDataModal'
import LegacySessionSendTransactionModal from '@/views/LegacySessionSendTransactionModal'
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
      {view === 'SessionSignCosmosModal' && <SessionSignCosmosModal />}
      {view === 'SessionSignSolanaModal' && <SessionSignSolanaModal />}
      {view === 'SessionSignPolkadotModal' && <SessionSignPolkadotModal />}
      {view === 'SessionSignNearModal' && <SessionSignNearModal />}
      {view === 'SessionSignElrondModal' && <SessionSignElrondModal />}
      {view === 'SessionSignTronModal' && <SessionSignTronModal />}
      {view === 'LegacySessionProposalModal' && <LegacySessionProposalModal />}
      {view === 'LegacySessionSignModal' && <LegacySessionSignModal />}
      {view === 'LegacySessionSignTypedDataModal' && <LegacySessionSignTypedDataModal />}
      {view === 'LegacySessionSendTransactionModal' && <LegacySessionSendTransactionModal />}
    </NextModal>
  )
}
