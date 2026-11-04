import { Button, Col, Input, Loading, Row, Text } from '@nextui-org/react'
import { useEffect, useRef, useState } from 'react'
import { MCP_INPUT_CSS, McpFieldHint } from '@/components/McpUi'
import { McpQuote, McpSwapAsset } from '@/utils/McpApiUtil'

/**
 * Types
 */
export interface McpSwapInput {
  chain: string
  from: McpSwapAsset
  amount: string
}

interface Props {
  chains: ReadonlyArray<{ id: string; name: string }>
  disabled: boolean
  onQuote: (input: McpSwapInput) => Promise<McpQuote>
  onPrepare: (input: McpSwapInput) => Promise<void>
}

const AMOUNT_PATTERN = /^\d+(\.\d+)?$/
const QUOTE_DEBOUNCE_MS = 500

/**
 * Component
 */
export default function McpSwapForm({ chains, disabled, onQuote, onPrepare }: Props) {
  const [chain, setChain] = useState(chains[0]?.name ?? '')
  const [from, setFrom] = useState<McpSwapAsset>('USDC')
  const [amount, setAmount] = useState('')
  const [quote, setQuote] = useState<McpQuote | null>(null)
  const [quoteError, setQuoteError] = useState('')
  const [quoting, setQuoting] = useState(false)
  const quoteRequest = useRef(0)

  const to: McpSwapAsset = from === 'USDC' ? 'ETH' : 'USDC'
  const amountValid = AMOUNT_PATTERN.test(amount) && Number(amount) > 0
  const amountError = amount && !amountValid ? 'Enter a positive decimal amount' : undefined

  // Live quote, debounced; a stale response is dropped by the request counter.
  useEffect(() => {
    setQuote(null)
    setQuoteError('')
    if (!amountValid || !chain) return
    const id = ++quoteRequest.current
    const timer = setTimeout(async () => {
      setQuoting(true)
      try {
        const result = await onQuote({ chain, from, amount })
        if (id === quoteRequest.current) setQuote(result)
      } catch (error) {
        if (id === quoteRequest.current) {
          setQuoteError(error instanceof Error ? error.message : String(error))
        }
      } finally {
        if (id === quoteRequest.current) setQuoting(false)
      }
    }, QUOTE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chain, from, amount, amountValid])

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
            aria-label="mcp swap chain"
            data-testid="mcp-swap-chain"
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
            Direction
          </Text>
          <select
            value={from}
            disabled={disabled}
            onChange={e => setFrom(e.currentTarget.value as McpSwapAsset)}
            aria-label="mcp swap direction"
            data-testid="mcp-swap-direction"
            style={{ width: '100%' }}
          >
            <option value="USDC">USDC → ETH</option>
            <option value="ETH">ETH → USDC</option>
          </select>
        </Col>
      </Row>

      <Input
        css={{ ...MCP_INPUT_CSS, marginBottom: '$6' }}
        label={`Amount in ${from}`}
        aria-label="mcp swap amount"
        placeholder={from === 'USDC' ? 'e.g. 10' : 'e.g. 0.005'}
        value={amount}
        disabled={disabled}
        onChange={e => setAmount(e.target.value.trim())}
        data-testid="mcp-swap-amount"
      />
      <McpFieldHint error={amountError} />

      <div
        style={{
          minHeight: 52,
          borderRadius: 14,
          background: 'rgba(255, 255, 255, 0.04)',
          padding: '10px 12px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}
      >
        {quoting ? <Loading size="xs" /> : null}
        {quote ? (
          <div style={{ minWidth: 0 }} data-testid="mcp-swap-quote">
            <Text size={14} weight="medium" css={{ margin: 0 }}>
              {quote.amountIn} {quote.from} ≈ {quote.amountOut} {quote.to}
            </Text>
            <Text size={12} color="$gray600" css={{ margin: 0 }}>
              {quote.pool} · max slippage 0.5%
              {from === 'USDC' ? ' · approval + swap' : ''}
            </Text>
          </div>
        ) : null}
        {quoteError ? (
          <Text size={13} color="error" css={{ margin: 0 }}>
            {quoteError}
          </Text>
        ) : null}
        {!quote && !quoteError && !quoting ? (
          <Text size={13} color="$gray600" css={{ margin: 0 }}>
            Enter an amount to see a live Uniswap V3 quote.
          </Text>
        ) : null}
      </div>

      <Button
        color="gradient"
        css={{ width: '100%' }}
        disabled={!amountValid || !chain || disabled}
        onClick={() => onPrepare({ chain, from, amount })}
        data-testid="mcp-swap-prepare"
      >
        Swap {from} → {to}
      </Button>
    </>
  )
}
