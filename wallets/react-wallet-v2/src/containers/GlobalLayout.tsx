import WalletConnectStore from '@/store/WalletConnectStore'
import WalletStore from '@/store/WalletStore'
import { Card, Container, Divider, Loading } from '@nextui-org/react'
import { Fragment, ReactNode, useCallback, useEffect, useState } from 'react'

/**
 * Types
 */
interface Props {
  children: ReactNode | ReactNode[]
}

/**
 * Container
 */
export default function GlobalLayout({ children }: Props) {
  const [initialized, setInitialized] = useState(false)

  const onInitialize = useCallback(async () => {
    WalletStore.createWallet()
    await WalletConnectStore.createWalletConnectClient()
    setInitialized(true)
  }, [])

  useEffect(() => {
    if (!initialized) {
      onInitialize()
    }
  }, [initialized, onInitialize])

  return (
    <Container
      display="flex"
      justify="center"
      alignItems="center"
      css={{ width: '100vw', height: '100vh' }}
    >
      <Card
        bordered
        borderWeight="light"
        css={{
          height: '92vh',
          maxWidth: '500px',
          width: '100%',
          justifyContent: initialized ? 'normal' : 'center',
          alignItems: initialized ? 'normal' : 'center'
        }}
      >
        {initialized ? (
          <Fragment>
            <Card.Body css={{ overflow: 'scroll' }}>{children}</Card.Body>
            <Divider />
            <Card.Footer>Footer</Card.Footer>
          </Fragment>
        ) : (
          <Loading />
        )}
      </Card>
    </Container>
  )
}
