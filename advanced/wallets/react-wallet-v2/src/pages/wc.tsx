import { Text } from '@nextui-org/react'
import { Fragment, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import WalletConnectPage from './walletconnect'
import ModalStore from '@/store/ModalStore'
import { useSnapshot } from 'valtio'

export default function DeepLinkPairingPage() {
  const state = useSnapshot(ModalStore.state)
  const router = useRouter()
  const [loadingMessage, setLoadingMessage] = useState<string>('')
  const [requestTimeout, setRequestTimeout] = useState<NodeJS.Timeout | null>(null)

  const uri = router.query.uri as string
  const requestId = router.query.requestId as string

  const removeTimeout = useCallback(() => {
    if (requestTimeout) {
      clearTimeout(requestTimeout)
    }
  }, [requestTimeout])

  useEffect(() => {
    if (state.view == 'LoadingModal') {
      const timeout = setTimeout(() => {
        setLoadingMessage('Your request is taking longer than usual. Feel free to try again.')
      }, 15_000)
      setRequestTimeout(timeout)
    } else if (state.view) {
      removeTimeout()
    }
  }, [state.view])

  useEffect(() => {
    if (requestId) {
      ModalStore.open('LoadingModal', { loadingMessage })
    }

    if (uri) {
      ModalStore.open('LoadingModal', { loadingMessage })
    }
  }, [uri, requestId, loadingMessage])

  if (!uri && !requestId) {
    return (
      <Fragment>
        <Text css={{ opacity: '0.5', textAlign: 'center', marginTop: '$20' }}>
          No URI provided via `?uri=` params
        </Text>
      </Fragment>
    )
  }

  return <WalletConnectPage deepLink={uri} />
}
