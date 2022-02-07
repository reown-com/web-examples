import WalletConnectStore from '@/store/WalletConnectStore'
import { Modal } from '@nextui-org/react'
import { CLIENT_EVENTS } from '@walletconnect/client'
import { SessionTypes } from '@walletconnect/types'
import { useCallback, useEffect, useState } from 'react'

export default function WalletConnectManager() {
  const [open, setOpen] = useState(false)
  const { client } = WalletConnectStore.state

  const onSessionProposal = useCallback((proposal: SessionTypes.Proposal) => {}, [])

  useEffect(() => {
    client.on(CLIENT_EVENTS.session.proposal, onSessionProposal)

    return () => client.disconnect()
  }, [client, onSessionProposal])

  return (
    <Modal closeButton open={open} onClose={() => setOpen(false)}>
      <Modal.Header></Modal.Header>
      <Modal.Body></Modal.Body>
      <Modal.Footer></Modal.Footer>
    </Modal>
  )
}
