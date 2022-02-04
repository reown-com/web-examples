import { WalletContext } from '@/contexts/WalletContext'
import { Card, Container, Divider, Loading } from '@nextui-org/react'
import { Fragment, ReactNode, useCallback, useContext, useEffect } from 'react'

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
  const { walletState, walletActions } = useContext(WalletContext)
  const waletReady = walletState.ready

  const onInitialize = useCallback(async () => {
    walletActions.createWallet()
    await walletActions.createWalletConnectClient()
    walletActions.setInitialized()
  }, [walletActions])

  useEffect(() => {
    if (!waletReady) {
      onInitialize()
    }
  }, [waletReady, onInitialize])

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
          maxWidth: '600px',
          width: '100%',
          justifyContent: waletReady ? 'normal' : 'center',
          alignItems: waletReady ? 'normal' : 'center'
        }}
      >
        {waletReady ? (
          <Fragment>
            <Card.Header>Header</Card.Header>
            <Divider />
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
