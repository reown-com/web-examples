import { Button, Container, Modal, Text } from '@nextui-org/react'
import { Fragment } from 'react'
import ErrorIcon from '@mui/icons-material/Error'

interface ErrorStateProps {
  errorMessage: string
  onClose: () => void
}

export default function ErrorState({ errorMessage, onClose }: ErrorStateProps) {
  return (
    <Fragment>
      <Modal.Header>
        <Text h3>Payment Error</Text>
      </Modal.Header>
      <Modal.Body>
        <Container css={{ padding: '40px 20px', textAlign: 'center' }}>
          <ErrorIcon sx={{ fontSize: 64, color: '#F31260' }} />
          <Text h4 css={{ marginTop: '16px' }} color="error">
            Something went wrong
          </Text>
          <Text css={{ marginTop: '8px' }} color="$gray700">
            {errorMessage}
          </Text>
        </Container>
      </Modal.Body>
      <Modal.Footer>
        <Button auto flat color="error" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Fragment>
  )
}
