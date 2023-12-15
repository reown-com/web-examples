import SettingsStore from '@/store/SettingsStore'
import { Button, Loading, Modal, Row } from '@nextui-org/react'
import { useMemo } from 'react'
import { useSnapshot } from 'valtio'

interface Props {
  onApprove: () => void
  onReject: () => void
  infoBoxCondition?: boolean
  infoBoxText?: string
  disabledApprove?: boolean
  loading?: boolean
}

export default function ModalFooter({
  onApprove,
  onReject,
  infoBoxCondition,
  infoBoxText,
  disabledApprove,
  loading = false,
}: Props) {
  const { currentRequestVerifyContext } = useSnapshot(SettingsStore.state)
  const validation = currentRequestVerifyContext?.verified.validation

  const approveButtonColor: any = useMemo(() => {
    switch (validation) {
      case 'INVALID':
        return 'error'
      case 'UNKNOWN':
        return 'warning'
      default:
        return 'success'
    }
  }, [validation])

  return (
    <Modal.Footer>
      {infoBoxCondition && (
        <Row style={{ textAlign: 'initial' }}>
          <span>{infoBoxText || ''}</span>
        </Row>
      )}
      <Row justify="space-between" align='center'>
        <Button
          auto
          flat
          style={{ color: 'white', backgroundColor: 'grey' }}
          onPress={onReject}
          data-testid="session-reject-button"
          disabled={loading}
        >
          Reject
        </Button>
        {loading ? <Loading style={{ width: '25%' }} size="sm" /> : (
          <Button
            auto
            flat
            color={approveButtonColor}
            disabled={disabledApprove || loading}
            onPress={onApprove}
            data-testid="session-approve-button"
          >
            Approve
          </Button>
        )}
      </Row>
    </Modal.Footer>
  )
}
