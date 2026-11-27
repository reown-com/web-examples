import { Button, Loading, Progress, Row, Text } from '@nextui-org/react'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { useEffect, useRef } from 'react'
import McpPlanSteps from '@/components/McpPlanSteps'
import { McpSection, McpStatusPill, useCountdown } from '@/components/McpUi'
import { isTerminalAction, McpAction, McpActionStatus } from '@/utils/McpApiUtil'

/**
 * Types
 */
interface Props {
  action: McpAction
  busy: boolean
  polling: boolean
  /** A wallet request modal is currently open */
  requestModalOpen: boolean
  onSend: () => void
  onOpenRequest: () => void
  onCancel: () => void
  onDismiss: () => void
  /** Present when the wallet knows the original request and can run it again */
  onRetry?: () => void
}

const TITLES: Record<McpActionStatus, string> = {
  prepared: 'Prepared, not sent yet',
  awaiting_wallet: 'Approve in this wallet',
  submitted: 'Transaction submitted',
  confirmed: 'Completed',
  rejected: 'Rejected in the wallet',
  expired: 'Expired',
  failed: 'Failed',
  cancelled: 'Cancelled'
}

/**
 * Component
 */
export default function McpActionCard({
  action,
  busy,
  polling,
  requestModalOpen,
  onSend,
  onOpenRequest,
  onCancel,
  onDismiss,
  onRetry
}: Props) {
  const terminal = isTerminalAction(action.status)
  const prepared = action.status === 'prepared'
  const expiresAt = prepared ? action.plan?.expiresAt : action.expiresAt
  const remaining = useCountdown(expiresAt)
  const initial = useRef<number | null>(null)
  useEffect(() => {
    initial.current = null
  }, [expiresAt])
  if (remaining !== null && initial.current === null) initial.current = Math.max(remaining, 1)
  const progress =
    remaining !== null && initial.current ? Math.round((remaining / initial.current) * 100) : null

  return (
    <McpSection
      title={TITLES[action.status]}
      subtitle={action.summary}
      right={<McpStatusPill status={action.status} data-testid="mcp-action-status" />}
      data-testid="mcp-action-card"
    >
      <McpPlanSteps action={action} />

      {remaining !== null && !terminal ? (
        <div style={{ marginBottom: 16 }}>
          <Row justify="space-between" css={{ marginBottom: '$2' }}>
            <Text size={12} color="$gray600" css={{ margin: 0 }}>
              {prepared ? 'Plan expires' : 'Wallet request expires'}
            </Text>
            <Text size={12} color={remaining === 0 ? 'error' : '$gray600'} css={{ margin: 0 }}>
              {remaining === 0 ? 'now' : `in ${remaining}s`}
            </Text>
          </Row>
          {progress !== null ? (
            <Progress value={progress} color={remaining === 0 ? 'error' : 'warning'} size="xs" />
          ) : null}
        </div>
      ) : null}

      {prepared ? (
        <Row css={{ gap: '$4' }}>
          <Button
            flat
            color="error"
            css={{ flex: 1 }}
            disabled={busy}
            onClick={onCancel}
            data-testid="mcp-action-cancel"
          >
            Cancel
          </Button>
          <Button
            color="gradient"
            css={{ flex: 1 }}
            disabled={busy || remaining === 0}
            onClick={onSend}
            data-testid="mcp-action-send"
          >
            {busy ? <Loading size="sm" type="points" color="white" /> : 'Send to wallet'}
          </Button>
        </Row>
      ) : null}

      {!prepared && !terminal ? (
        <>
          <Row align="center" css={{ gap: '$4', marginBottom: '$6' }}>
            <Loading size="xs" />
            <Text size={13} css={{ margin: 0 }}>
              {action.status === 'awaiting_wallet'
                ? requestModalOpen
                  ? 'The request is open in the wallet modal.'
                  : 'The request is waiting in this wallet.'
                : 'Waiting for the transaction to confirm on chain.'}
              {polling ? '' : ' Status updates are paused.'}
            </Text>
          </Row>
          <Row css={{ gap: '$4' }}>
            <Button
              flat
              color="error"
              size="sm"
              css={{ flex: 1 }}
              disabled={busy}
              onClick={onCancel}
              data-testid="mcp-action-cancel"
            >
              Cancel remaining
            </Button>
            {action.status === 'awaiting_wallet' && !requestModalOpen ? (
              <Button
                bordered
                size="sm"
                css={{ flex: 1 }}
                icon={<OpenInNewIcon style={{ fontSize: 16 }} />}
                onClick={onOpenRequest}
                data-testid="mcp-action-open-request"
              >
                Open request
              </Button>
            ) : null}
          </Row>
        </>
      ) : null}

      {terminal ? (
        <Row css={{ gap: '$4' }}>
          <Button
            bordered
            size="sm"
            css={{ flex: 1 }}
            onClick={onDismiss}
            data-testid="mcp-action-dismiss"
          >
            Done
          </Button>
          {onRetry && action.status !== 'confirmed' ? (
            <Button
              color="gradient"
              size="sm"
              css={{ flex: 1 }}
              disabled={busy}
              onClick={onRetry}
              data-testid="mcp-action-retry"
            >
              Try again
            </Button>
          ) : null}
        </Row>
      ) : null}
    </McpSection>
  )
}
