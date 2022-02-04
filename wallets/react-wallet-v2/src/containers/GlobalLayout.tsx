import { WalletContext } from '@/contexts/WalletContext'
import { Card, Container, Divider, Loading } from '@nextui-org/react'
import { Fragment, ReactNode, useContext, useEffect } from 'react'

interface Props {
  children: ReactNode | ReactNode[]
}

export default function GlobalLayout({ children }: Props) {
  const { state, actions } = useContext(WalletContext)
  const hasWallet = state.wallet !== undefined

  useEffect(() => {
    if (!hasWallet) {
      actions.createWallet()
    }
  }, [actions, hasWallet])

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
        css={{ height: '92vh', maxWidth: '600px', width: '100%' }}
      >
        {hasWallet ? (
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
