import { useSnapshot } from 'valtio'
import ModalStore from '@/store/ModalStore'
import SessionProposalModal from './SessionProposalModal'
import SessionRequestModal from './SessionRequestModal'
import PaymentModal from './payment/PaymentModal'

export default function Modal() {
  const { open, view } = useSnapshot(ModalStore.state)

  if (!open) return null

  return (
    <div className="overlay" onMouseDown={() => ModalStore.close()}>
      <div onMouseDown={event => event.stopPropagation()}>
        {view === 'SessionProposal' && <SessionProposalModal />}
        {view === 'SessionRequest' && <SessionRequestModal />}
        {view === 'Payment' && <PaymentModal />}
      </div>
    </div>
  )
}
