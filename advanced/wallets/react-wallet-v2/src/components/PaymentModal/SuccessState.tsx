import { Button, Container, Modal, Text } from '@nextui-org/react'
import { Fragment } from 'react'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'

interface SuccessStateProps {
  onClose: () => void
}

export default function SuccessState({ onClose }: SuccessStateProps) {
  return (
    <Fragment>
      <Modal.Header>
        <Text h3>Payment Complete</Text>
      </Modal.Header>
      <Modal.Body>
        <Container css={{ padding: '40px 20px', textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 80, color: '#17C964' }} />
          <Text h4 css={{ marginTop: '16px' }} color="success">
            Payment Successful
          </Text>
          <Text css={{ marginTop: '8px' }} color="$gray700">
            Your payment has been processed successfully.
          </Text>
        </Container>
      </Modal.Body>
      <Modal.Footer>
        <Button auto color="success" onClick={onClose}>
          Done
        </Button>
      </Modal.Footer>
    </Fragment>
  )
}
