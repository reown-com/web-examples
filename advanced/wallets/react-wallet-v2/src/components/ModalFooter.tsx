import SettingsStore from '@/store/SettingsStore'
import { Button, Modal, Row, Loading } from '@nextui-org/react'
import { useMemo } from 'react'
import { useSnapshot } from 'valtio'
export interface LoaderProps {
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'white'
  active?: boolean
}
interface Props {
  onApprove: () => void
  onReject: () => void
  infoBoxCondition?: boolean
  infoBoxText?: string
  disabledApprove?: boolean
  approveLoader?: LoaderProps
  rejectLoader?: LoaderProps
}

export default function ModalFooter({
  onApprove,
  approveLoader,
  onReject,
  rejectLoader,
  infoBoxCondition,
  infoBoxText,
  disabledApprove
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
      <Row justify="space-between">
        <Button
          auto
          flat
          style={{ color: 'white', backgroundColor: 'grey' }}
          onPress={onReject}
          data-testid="session-reject-button"
        >
          {rejectLoader && rejectLoader.active ? (
            <Loading size="md" type="points" color={rejectLoader.color || 'white'} />
          ) : (
            'Reject'
          )}
        </Button>
        <Button
          auto
          flat
          color={approveButtonColor}
          disabled={disabledApprove}
          onPress={onApprove}
          data-testid="session-approve-button"
        >
          {approveLoader && approveLoader.active ? (
            <Loading size="md" type="points" color={approveLoader.color || approveButtonColor} />
          ) : (
            'Approve'
          )}
        </Button>
      </Row>
    </Modal.Footer>
  )
}
