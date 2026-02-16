import { Container, Loading, Modal, Text } from '@nextui-org/react'
import { Fragment } from 'react'

export default function LoadingState() {
  return (
    <Fragment>
      <Modal.Header>
        <Text h3>Payment</Text>
      </Modal.Header>
      <Modal.Body>
        <Container css={{ padding: '40px 20px', textAlign: 'center' }}>
          <Loading size="xl" color="primary" />
          <Text css={{ marginTop: '20px' }} color="$gray700">
            Fetching payment options...
          </Text>
        </Container>
      </Modal.Body>
    </Fragment>
  )
}
