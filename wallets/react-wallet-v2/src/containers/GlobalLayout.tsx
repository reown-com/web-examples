import { WalletContext } from '@/contexts/WalletContext'
import { Card, Container, Divider, Loading } from '@nextui-org/react'
import { Fragment, ReactNode, useCallback, useContext, useEffect } from 'react'

interface Props {
  children: ReactNode | ReactNode[]
}

export default function GlobalLayout({ children }: Props) {
  const {
    state: { initialized },
    actions
  } = useContext(WalletContext)

  const onInitialize = useCallback(async () => {
    actions.createWallet()
    await actions.createWalletConnectClient()
    actions.setInitialized()
  }, [actions])

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
          maxWidth: '600px',
          width: '100%',
          justifyContent: initialized ? 'normal' : 'center',
          alignItems: initialized ? 'normal' : 'center'
        }}
      >
        {initialized ? (
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
