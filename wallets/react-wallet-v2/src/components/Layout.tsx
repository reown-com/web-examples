import { Card, Container, Divider } from '@nextui-org/react'
import { ReactNode } from 'react'

interface Props {
  children: ReactNode | ReactNode[]
}

export default function Layout({ children }: Props) {
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
        <Card.Header>Header</Card.Header>

        <Divider />

        <Card.Body css={{ overflow: 'scroll' }}>{children}</Card.Body>

        <Divider />

        <Card.Footer>Footer</Card.Footer>
      </Card>
    </Container>
  )
}
