import { Card, Row, Col, Text, styled } from '@nextui-org/react'
import { ProtocolConfig } from '@/types/earn'
import Image from 'next/image'

// Minimal Badge component
const Badge = styled('span', {
  display: 'inline-flex',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: '500',
  variants: {
    color: {
      success: {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        color: 'rgb(34, 197, 94)'
      },
      warning: {
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        color: 'rgb(251, 191, 36)'
      },
      error: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        color: 'rgb(239, 68, 68)'
      },
      primary: {
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        color: 'rgb(99, 102, 241)'
      },
      secondary: {
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        color: 'rgb(168, 85, 247)'
      },
      default: {
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
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
          marginBottom: '10px'
        }}
      >
        <div>
          <Text css={{ margin: 0, fontSize: '16px', fontWeight: '600', lineHeight: 1.3 }}>
            {config.protocol.displayName}
          </Text>
          <Text css={{ margin: 0, marginTop: '2px', fontSize: '12px', color: '$gray600' }}>
            {config.token.symbol} • {config.chainName}
          </Text>
        </div>
        <div>
          <Text css={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'rgb(34, 197, 94)' }}>
            {config.apy.toFixed(2)}% APY
          </Text>
        </div>
      </div>

      {/* Details */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ textAlign: 'right' }}>
            <Text css={{ fontSize: '11px', color: '$gray600', margin: 0 }}>TVL: {config.tvl}</Text>
          </div>
          <Badge color={getRiskColor(config.riskLevel)}>Risk: {config.riskLevel}</Badge>
        </div>
      </div>
    </StyledCard>
  )
}
