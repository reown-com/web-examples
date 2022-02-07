import ModalStore from '@/store/ModalStore'
import { Modal as NextModal } from '@nextui-org/react'
import { useSnapshot } from 'valtio'

export default function Modal() {
  const { open } = useSnapshot(ModalStore.state)

  return (
    <NextModal open={open} onClose={ModalStore.close}>
      <NextModal.Header></NextModal.Header>
      <NextModal.Body></NextModal.Body>
      <NextModal.Footer></NextModal.Footer>
    </NextModal>
  )
}
