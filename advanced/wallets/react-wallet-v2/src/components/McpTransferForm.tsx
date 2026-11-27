import { Button, Col, Input, Row, Text } from '@nextui-org/react'
import { useMemo, useState } from 'react'
import { isAddress } from 'viem'
import { MCP_INPUT_CSS, McpFieldHint } from '@/components/McpUi'

/**
 * Types
 */
export interface McpTransferInput {
  chain: string
  token: string
  amount: string
  to: string
}

interface Props {
  chains: ReadonlyArray<{ id: string; name: string }>
  caps: { eth: string; usdc: string } | null
  disabled: boolean
  onPrepare: (input: McpTransferInput) => Promise<void>
}

const TOKENS = ['ETH', 'USDC'] as const
const AMOUNT_PATTERN = /^\d+(\.\d+)?$/

function getAmountError(amount: string): string | undefined {
  if (!amount) return undefined
  if (!AMOUNT_PATTERN.test(amount) || Number(amount) <= 0) return 'Enter a positive decimal amount'
  return undefined
}

/**
 * Component
 */
export default function McpTransferForm({ chains, caps, disabled, onPrepare }: Props) {
  const [chain, setChain] = useState(chains[0]?.name ?? '')
  const [token, setToken] = useState<typeof TOKENS[number]>('ETH')
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')

  const recipientError = useMemo(
    () => (to && !isAddress(to, { strict: false }) ? 'Invalid recipient address' : undefined),
    [to]
  )
  const amountError = getAmountError(amount)
  const cap = caps ? (token === 'ETH' ? caps.eth : caps.usdc) : undefined
  const canSubmit = Boolean(chain && to && amount) && !recipientError && !amountError && !disabled

  return (
    <>
      <Row css={{ gap: '$6', marginBottom: '$6' }}>
        <Col>
          <Text size={12} color="$gray600" css={{ marginBottom: '$2' }}>
            Chain
          </Text>
          <select
            value={chain}
            disabled={disabled}
            onChange={e => setChain(e.currentTarget.value)}
            aria-label="mcp transfer chain"
            data-testid="mcp-transfer-chain"
            style={{ width: '100%' }}
          >
            {chains.map(option => (
              <option key={option.id} value={option.name}>
                {option.name}
              </option>
            ))}
          </select>
        </Col>
        <Col>
          <Text size={12} color="$gray600" css={{ marginBottom: '$2' }}>
            Token
          </Text>
          <select
            value={token}
            disabled={disabled}
            onChange={e => setToken(e.currentTarget.value as typeof TOKENS[number])}
            aria-label="mcp transfer token"
            data-testid="mcp-transfer-token"
            style={{ width: '100%' }}
          >
            {TOKENS.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Col>
      </Row>

      <Input
        css={{ ...MCP_INPUT_CSS, marginBottom: '$6' }}
        label="Recipient"
        aria-label="mcp transfer recipient"
        placeholder="0x…"
        value={to}
        disabled={disabled}
        onChange={e => setTo(e.target.value.trim())}
        data-testid="mcp-transfer-to"
      />
      <McpFieldHint error={recipientError} />

      <Input
        css={{ ...MCP_INPUT_CSS, marginBottom: '$8' }}
        label="Amount"
        aria-label="mcp transfer amount"
        placeholder={token === 'ETH' ? 'e.g. 0.001' : 'e.g. 5'}
        value={amount}
        disabled={disabled}
        onChange={e => setAmount(e.target.value.trim())}
        data-testid="mcp-transfer-amount"
      />
      <McpFieldHint
        error={amountError}
        hint={cap ? `Up to ${cap} ${token} per transaction` : undefined}
      />

      <Button
        color="gradient"
        css={{ width: '100%' }}
        disabled={!canSubmit}
        onClick={() => onPrepare({ chain, token, amount, to })}
        data-testid="mcp-transfer-prepare"
      >
        Send transfer
      </Button>
    </>
  )
}
