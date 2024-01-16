import { Text } from '@nextui-org/react'
import { Fragment } from 'react'
import { useRouter } from 'next/router'
import WalletConnectPage from './walletconnect'

export default function DeepLinkPairingPage() {
  const router = useRouter()

  const uri = router.query.uri as string
  const requestId = router.query.requestId as string

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
