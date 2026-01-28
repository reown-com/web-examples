import { Input, Button, Row, Text, styled } from '@nextui-org/react'
import { ChangeEvent, useMemo } from 'react'

const StyledText = styled(Text, {
  fontWeight: 400
} as any)

interface AmountInputProps {
  value: string
  onChange: (value: string) => void
  balance: string
  tokenSymbol: string
  disabled?: boolean
  label?: string
  placeholder?: string
}

export default function AmountInput({
  value,
  onChange,
  balance,
  tokenSymbol,
  disabled = false,
  label = 'Amount to Deposit',
  placeholder = '0.00'
}: AmountInputProps) {
  const handleChange = (e: ChangeEvent<any>) => {
    const inputValue = e.target.value
    // Allow only numbers and decimal point
    if (inputValue === '' || /^\d*\.?\d*$/.test(inputValue)) {
      onChange(inputValue)
    }
  }

  const handleMaxClick = () => {
    onChange(balance)
  }

  const isMaxDisabled = useMemo(() => {
    return disabled || !balance || balance === '0'
  }, [disabled, balance])

  const formattedBalance = useMemo(() => {
    if (!balance || balance === '0') return '0.00'
    const num = parseFloat(balance)
    if (isNaN(num)) return '0.00'
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }, [balance])

  return (
    <div style={{ width: '100%' }}>
      <Row justify="space-between" align="center" css={{ marginBottom: '$4' }}>
        <Text css={{ fontSize: '12px', fontWeight: '600' }}>{label}</Text>
        <Text css={{ fontSize: '12px', color: '$gray600' }}>
          Balance: {formattedBalance} {tokenSymbol}
        </Text>
      </Row>

      <div style={{ position: 'relative' }}>
        <Input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          size="lg"
          width="100%"
          css={{
            '& input': {
              fontSize: '16px',
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
          <Text css={{ fontSize: '14px', color: '$gray600' }}>{tokenSymbol}</Text>
          <Button
            size="xs"
            auto
            flat
            color="primary"
            onClick={handleMaxClick}
            disabled={isMaxDisabled}
            css={{ fontSize: '11px', minWidth: '50px' }}
          >
            MAX
          </Button>
        </div>
      </div>
    </div>
  )
}
