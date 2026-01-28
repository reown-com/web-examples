import { Card, Row, Col, Text, styled } from '@nextui-org/react'
import { ProtocolConfig } from '@/types/earn'
import Image from 'next/image'
import { useSnapshot } from 'valtio'
import EarnStore from '@/store/EarnStore'

// APY Badge component - matching PositionCard
const APYBadge = styled('span', {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '16px',
  fontWeight: '500',
  backgroundColor: 'rgba(34, 197, 94, 0.1)',
  color: 'rgb(34, 197, 94)'
} as any)

// Minimal Badge component for Risk
const Badge = styled('span', {
  display: 'inline-flex',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: '500',
  variants: {
    color: {
      success: {
        color: 'rgb(34, 197, 94)'
      },
      warning: {
        color: 'rgb(251, 191, 36)'
      },
      error: {
        color: 'rgb(239, 68, 68)'
      },
      primary: {
        color: 'rgb(99, 102, 241)'
      },
      secondary: {
        color: 'rgb(168, 85, 247)'
      },
      default: {
        color: 'rgb(156, 163, 175)'
      }
    }
  }
} as any)

const StyledCard = styled(Card, {
  padding: '0px',
  marginBottom: '12px',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  '&:hover': {
    borderColor: 'rgba(99, 102, 241, 0.5)',
    backgroundColor: 'rgba(99, 102, 241, 0.02)'
  }
} as any)

interface ProtocolCardProps {
  config: ProtocolConfig
  selected?: boolean
  onSelect: (config: ProtocolConfig) => void
}

export default function ProtocolCard({ config, selected, onSelect }: ProtocolCardProps) {
  const { apyData, tvlData } = useSnapshot(EarnStore.state)

  // Get live APY from store, fallback to config APY
  const displayAPY = apyData[`${config.protocol.id}-${config.chainId}`] ?? config.apy

  // Get live TVL from store, fallback to config TVL
  const displayTVL = tvlData[`${config.protocol.id}-${config.chainId}`]
  const formattedTVL = displayTVL
    ? `$${parseFloat(displayTVL).toLocaleString('en-US', {
        maximumFractionDigits: 1,
        notation: 'compact',
        compactDisplay: 'short'
      })}`
    : config.tvl

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low':
        return 'success'
      case 'Medium':
        return 'warning'
      case 'High':
        return 'error'
      default:
        return 'default'
    }
  }

  return (
    <StyledCard
      isPressable
      onClick={() => onSelect(config)}
      css={{
        borderColor: selected ? 'rgb(99, 102, 241)' : 'rgba(255, 255, 255, 0.1)',
        backgroundColor: selected ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
      }}
    >
      {/* Protocol Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2px'
        }}
      >
        <Text css={{ margin: 0, fontSize: '16px', fontWeight: '600', lineHeight: 1.2 }}>
          {config.protocol.displayName}
        </Text>
        <APYBadge>{displayAPY.toFixed(2)}% APY</APYBadge>
      </div>

      {/* Second Row: Token and Chain */}
      <div style={{ marginBottom: '10px' }}>
        <Text css={{ margin: 0, fontSize: '12px', color: '$gray600' }}>
          {config.token.symbol} • {config.chainName}
        </Text>
      </div>

      {/* Details */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ textAlign: 'right' }}>
            <Text css={{ fontSize: '11px', color: '$gray600', margin: 0 }}>
              TVL: {formattedTVL}
            </Text>
          </div>
          <Badge color={getRiskColor(config.riskLevel)}>Risk: {config.riskLevel}</Badge>
        </div>
      </div>
    </StyledCard>
  )
}
