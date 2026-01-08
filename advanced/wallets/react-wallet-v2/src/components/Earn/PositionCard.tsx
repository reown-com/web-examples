import { Card, Row, Col, Text, Button, styled, Input, Divider } from '@nextui-org/react'
import { UserPosition } from '@/types/earn'
import { PROTOCOL_CONFIGS } from '@/data/EarnProtocolsData'
import { useMemo, useState, ChangeEvent } from 'react'

// Simple Badge component since NextUI v1 doesn't have Badge
const Badge = styled('span', {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '16px',
  fontWeight: '500',
  backgroundColor: 'rgba(34, 197, 94, 0.1)',
  color: 'rgb(34, 197, 94)'
} as any)

const StyledCard = styled(Card, {
  padding: '0px',
  marginBottom: '12px',
  border: '1px solid rgba(255, 255, 255, 0.1)'
} as any)

const StyledText = styled(Text, {
  fontWeight: 400
} as any)

interface PositionCardProps {
  position: UserPosition
  onWithdraw: (position: UserPosition, amount: string) => void
}

export default function PositionCard({ position, onWithdraw }: PositionCardProps) {
  const [withdrawAmount, setWithdrawAmount] = useState('')

  const protocolConfig = useMemo(
    () =>
      PROTOCOL_CONFIGS.find(
        p => p.protocol.id === position.protocol && p.chainId === position.chainId
      ),
    [position.protocol, position.chainId]
  )

  const protocol = protocolConfig?.protocol

  const formattedDepositDate = useMemo(() => {
    const date = new Date(position.depositedAt)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }, [position.depositedAt])

  const durationDays = useMemo(() => {
    const now = Date.now()
    const diff = now - position.depositedAt
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }, [position.depositedAt])

  const handleWithdrawAmountChange = (e: ChangeEvent<any>) => {
    const inputValue = e.target.value
    // Allow only numbers and decimal point
    if (inputValue === '' || /^\d*\.?\d*$/.test(inputValue)) {
      setWithdrawAmount(inputValue)
    }
  }

  const handleMaxClick = () => {
    setWithdrawAmount(position.total)
  }

  const handleWithdrawClick = () => {
    onWithdraw(position, withdrawAmount)
  }

  return (
    <StyledCard>
      {/* Header Row: Protocol Name and APY */}
      <Row align="center" justify="space-between" css={{ marginBottom: '2px' }}>
        <Text css={{ margin: 0, fontSize: '16px', fontWeight: '600', lineHeight: 1.2 }}>
          {protocol?.displayName || position.protocol}
        </Text>
        <Badge>{position.apy.toFixed(2)}% APY</Badge>
      </Row>

      {/* Second Row: Token and Chain */}
      <Row css={{ marginBottom: '16px' }}>
        <StyledText css={{ fontSize: '12px', color: '$gray600' }}>
          {position.token} • Base
        </StyledText>
      </Row>

      {/* Third Row: Deposit Amount (left) and Rewards (right) */}
      <Row justify="space-between" css={{ marginBottom: '16px' }}>
        <Col css={{ width: 'auto' }}>
          <StyledText css={{ fontSize: '11px', color: '$gray600', marginBottom: '4px' }}>
            Deposit Amount
          </StyledText>
          <Text weight="semibold" css={{ margin: 0, fontSize: '13px' }}>
            {parseFloat(position.principal).toLocaleString('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2
            })}{' '}
            {position.token}
          </Text>
        </Col>

        <Col css={{ width: 'auto', textAlign: 'right' }}>
          <StyledText css={{ fontSize: '11px', color: '$gray600', marginBottom: '4px' }}>
            Rewards Earned
          </StyledText>
          <Text weight="semibold" css={{ margin: 0, fontSize: '13px', color: '$success' }}>
            +
            {parseFloat(position.rewards).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6
            })}{' '}
            {position.token}
          </Text>
        </Col>
      </Row>
      <Divider />
      {/* Withdrawal Input */}
      <Row css={{ margin: '12px 0' }}>
        <div style={{ width: '100%' }}>
          <Row justify="space-between" align="center" css={{ marginBottom: '$2' }}>
            <Text css={{ fontSize: '11px', fontWeight: '600' }}>Amount to Withdraw</Text>
            <Text css={{ fontSize: '11px', color: '$gray600' }}>
              Available:{' '}
              {parseFloat(position.total).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6
              })}{' '}
              {position.token}
            </Text>
          </Row>

          <div style={{ position: 'relative' }}>
            <Input
              type="text"
              value={withdrawAmount}
              onChange={handleWithdrawAmountChange}
              placeholder="0.00"
              size="lg"
              width="100%"
              css={{
                '& input': {
                  fontSize: '14px',
                  fontWeight: '600',
                  paddingRight: '120px'
                },
                '& .nextui-input-wrapper': {
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Text css={{ fontSize: '13px', color: '$gray600' }}>{position.token}</Text>
              <Button
                size="xs"
                auto
                flat
                color="primary"
                onClick={handleMaxClick}
                css={{ fontSize: '11px', minWidth: '50px' }}
              >
                MAX
              </Button>
            </div>
          </div>
        </div>
      </Row>
      <Row>
        {/* Withdraw Button */}
        <div style={{ marginTop: '12px', width: '100%' }}>
          <Button
            onClick={handleWithdrawClick}
            disabled={
              !withdrawAmount ||
              parseFloat(withdrawAmount) <= 0 ||
              parseFloat(withdrawAmount) > parseFloat(position.total)
            }
            css={{
              fontSize: '11px',
              width: '100%',
              height: '36px',
              minWidth: 'auto',
              backgroundColor: 'rgb(99, 102, 241)',
              '&:hover': {
                backgroundColor: 'rgb(79, 82, 221)'
              }
            }}
          >
            Withdraw
          </Button>
        </div>
      </Row>
    </StyledCard>
  )
}
