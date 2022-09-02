import ModalStore from '@/store/ModalStore'
import AuthenticationRequestModal from '@/views/AuthenticationRequestModal'
import { Modal as NextModal } from '@nextui-org/react'
import { useSnapshot } from 'valtio'

export default function Modal() {
  const { open, view } = useSnapshot(ModalStore.state)

  return (
    <NextModal blur open={open} style={{ border: '1px solid rgba(139, 139, 139, 0.4)' }}>
      {view === 'AuthenticationRequest' && <AuthenticationRequestModal />}
    </NextModal>
  )
}
