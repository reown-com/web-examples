import { Card, Row, Col, Text, Button, styled } from '@nextui-org/react'
import { UserPosition } from '@/types/earn'
import { PROTOCOLS } from '@/data/EarnProtocolsData'
import Image from 'next/image'
import { useMemo } from 'react'

// Simple Badge component since NextUI v1 doesn't have Badge
const Badge = styled('span', {
  display: 'inline-block',
  padding: '4px 12px',
  borderRadius: '12px',
  fontSize: '12px',
  fontWeight: '600',
  backgroundColor: 'rgba(23, 201, 100, 0.15)',
  color: '#17c964'
} as any)

const StyledCard = styled(Card, {
  padding: '$6',
  marginBottom: '$6'
} as any)

const StyledText = styled(Text, {
  fontWeight: 400
} as any)

interface PositionCardProps {
  position: UserPosition
  onWithdraw: (position: UserPosition) => void
}

export default function PositionCard({ position, onWithdraw }: PositionCardProps) {
  const protocol = PROTOCOLS[position.protocol.toUpperCase()]

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

  return (
    <StyledCard>
      <Row align="center" justify="space-between">
        <Col css={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '$3' }}>
          {protocol?.logo && (
            <Image
              src={protocol.logo}
              alt={protocol.name}
              width={28}
              height={28}
              style={{ borderRadius: '50%' }}
            />
          )}
          <div>
            <Text h6 css={{ margin: 0, lineHeight: 1.2 }}>
              {protocol?.displayName || position.protocol}
            </Text>
            <StyledText size="$xs" color="$gray600" css={{ marginTop: '$1' }}>
              {position.token} • Deposited {formattedDepositDate} ({durationDays} days)
            </StyledText>
          </div>
        </Col>

        <Col css={{ width: 'auto' }}>
          <Badge>{position.apy.toFixed(2)}% APY</Badge>
        </Col>
      </Row>

      <Row css={{ marginTop: '$6', gap: '$6' }}>
        <Col>
          <StyledText size="$xs" color="$gray600" css={{ marginBottom: '$1' }}>
            Principal
          </StyledText>
          <Text weight="semibold" size="$sm" css={{ margin: 0 }}>
            {parseFloat(position.principal).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6
            })}{' '}
            {position.token}
          </Text>
          <StyledText size="$xs" color="$gray600">
            ${position.principalUSD}
          </StyledText>
        </Col>

        <Col>
          <StyledText size="$xs" color="$gray600" css={{ marginBottom: '$1' }}>
            Rewards Earned
          </StyledText>
          <Text weight="semibold" size="$sm" css={{ margin: 0, color: '$success' }}>
            +
            {parseFloat(position.rewards).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6
            })}{' '}
            {position.token}
          </Text>
          <StyledText size="$xs" color="$gray600">
            ${position.rewardsUSD}
          </StyledText>
        </Col>

        <Col>
          <StyledText size="$xs" color="$gray600" css={{ marginBottom: '$1' }}>
            Total Value
          </StyledText>
          <Text weight="bold" size="$sm" css={{ margin: 0 }}>
            {parseFloat(position.total).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6
            })}{' '}
            {position.token}
          </Text>
          <StyledText size="$xs" color="$gray600">
            ${position.totalUSD}
          </StyledText>
        </Col>
      </Row>

      <Row css={{ marginTop: '$6' }} justify="flex-end">
        <Button size="sm" color="error" flat auto onClick={() => onWithdraw(position)}>
          Withdraw All
        </Button>
      </Row>
    </StyledCard>
  )
}
