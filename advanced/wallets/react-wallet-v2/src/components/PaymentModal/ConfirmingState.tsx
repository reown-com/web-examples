import { Container, Loading, Modal, Text } from '@nextui-org/react'
import { Fragment } from 'react'

export default function ConfirmingState() {
  return (
    <Fragment>
      <Modal.Header css={{ justifyContent: 'center' }}>
        <Text h3>Processing Payment</Text>
      </Modal.Header>
      <Modal.Body>
        <Container css={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Loading size="xl" color="primary" />
          <Text h4 css={{ marginTop: '20px' }}>
            Confirming payment...
          </Text>
        </Container>
      </Modal.Body>
    </Fragment>
  )
}
