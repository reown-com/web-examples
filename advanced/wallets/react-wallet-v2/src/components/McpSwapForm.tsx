import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import { Button, Col, Input, Loading, Row, Text } from '@nextui-org/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MCP_INPUT_CSS, McpFieldHint } from '@/components/McpUi'
import { McpQuote, McpSwapAssetInfo, McpSwapChainAssets } from '@/utils/McpApiUtil'

/**
 * Types
 */
export interface McpSwapInput {
  chain: string
  /** Symbol of the asset sold */
  from: string
  /** Symbol of the asset bought */
  to: string
  amount: string
}

interface Props {
  /** Chains and what can be swapped on each, from GET /swaps/assets; null while not loaded */
  chains: ReadonlyArray<McpSwapChainAssets> | null
  chainsError: string | null
  /** Per-transaction caps keyed by lower-case symbol */
  caps: Readonly<Record<string, string>> | null
  disabled: boolean
  onReloadChains: () => void
  onQuote: (input: McpSwapInput) => Promise<McpQuote>
  onPrepare: (input: McpSwapInput) => Promise<void>
}

const AMOUNT_PATTERN = /^\d+(\.\d+)?$/
const QUOTE_DEBOUNCE_MS = 500
const PREFERRED_PAIR: [string, string] = ['USDC', 'ETH']

/** USDC → ETH where the chain has both, else the first two assets listed */
function defaultPair(assets: ReadonlyArray<McpSwapAssetInfo>): [string, string] {
  const symbols = assets.map(asset => asset.symbol)
  if (PREFERRED_PAIR.every(symbol => symbols.includes(symbol))) return PREFERRED_PAIR
  return [symbols[0] ?? '', symbols[1] ?? '']
}

function placeholderFor(symbol: string) {
  if (symbol === 'USDC') return 'e.g. 10'
  if (symbol === 'ETH') return 'e.g. 0.005'
  return 'e.g. 0.001'
}

const SELECT_STYLE = { width: '100%' }

/**
 * Component
 */
export default function McpSwapForm({
  chains,
  chainsError,
  caps,
  disabled,
  onReloadChains,
  onQuote,
  onPrepare
}: Props) {
  const [chain, setChain] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [quote, setQuote] = useState<McpQuote | null>(null)
  const [quoteError, setQuoteError] = useState('')
  const [quoting, setQuoting] = useState(false)
  const quoteRequest = useRef(0)

  // Only chains with something to swap
  const options = useMemo(
    () => (chains ?? []).filter(option => option.assets.length >= 2),
    [chains]
  )
  const current = options.find(option => option.chain === chain) ?? null
  const assets = current?.assets ?? []
  const fromAsset = assets.find(asset => asset.symbol === from)
  const pairValid = Boolean(
    fromAsset && to && from !== to && assets.some(asset => asset.symbol === to)
  )
  const amountValid = AMOUNT_PATTERN.test(amount) && Number(amount) > 0
  const amountError = amount && !amountValid ? 'Enter a positive decimal amount' : undefined
  const cap = from ? caps?.[from.toLowerCase()] : undefined
  /** Selling a token takes an exact-amount approval first; selling the native asset is one step */
  const twoStep = Boolean(fromAsset && !fromAsset.native)

  // First load, or the chosen chain is gone after a refresh: the first chain and its default pair
  useEffect(() => {
    if (current || !options.length) return
    const first = options[0]
    const [nextFrom, nextTo] = defaultPair(first.assets)
    setChain(first.chain)
    setFrom(nextFrom)
    setTo(nextTo)
  }, [options, current])

  function selectChain(name: string) {
    const next = options.find(option => option.chain === name)
    if (!next) return
    setChain(name)
    // Keep the pair when the new chain offers it, else fall back to its default
    const symbols = next.assets.map(asset => asset.symbol)
    if (!symbols.includes(from) || !symbols.includes(to)) {
      const [nextFrom, nextTo] = defaultPair(next.assets)
      setFrom(nextFrom)
      setTo(nextTo)
    }
  }

  function selectFrom(symbol: string) {
    if (symbol === to) setTo(from)
    setFrom(symbol)
  }

  function selectTo(symbol: string) {
    if (symbol === from) setFrom(to)
    setTo(symbol)
  }

  function flip() {
    setFrom(to)
    setTo(from)
  }

  // Live quote, debounced; a stale response is dropped by the request counter.
  useEffect(() => {
    setQuote(null)
    setQuoteError('')
    if (!amountValid || !chain || !pairValid) return
    const id = ++quoteRequest.current
    const timer = setTimeout(async () => {
      setQuoting(true)
      try {
        const result = await onQuote({ chain, from, to, amount })
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
  }, [chain, from, to, amount, amountValid, pairValid])

  if (!chains && !chainsError) {
    return (
      <Row align="center" css={{ gap: '$4', padding: '$4 0' }} data-testid="mcp-swap-loading">
        <Loading size="xs" />
        <Text size={13} color="$gray600" css={{ margin: 0 }}>
          Loading what the server can swap
        </Text>
      </Row>
    )
  }

  if (chainsError || !options.length) {
    return (
      <Row align="center" justify="space-between" css={{ gap: '$4', padding: '$4 0' }}>
        <Text
          size={13}
          color={chainsError ? 'error' : '$gray600'}
          css={{ margin: 0, wordBreak: 'break-word' }}
          data-testid="mcp-swap-assets-error"
        >
          {chainsError ?? 'The server offers no swaps right now.'}
        </Text>
        <Button
          size="xs"
          auto
          bordered
          disabled={disabled}
          onClick={onReloadChains}
          css={{ flexShrink: 0 }}
          data-testid="mcp-swap-assets-retry"
        >
          Retry
        </Button>
      </Row>
    )
  }

  return (
    <>
      <Row css={{ marginBottom: '$6' }}>
        <Col>
          <Text size={12} color="$gray600" css={{ marginBottom: '$2' }}>
            Chain
          </Text>
          <select
            value={chain}
            disabled={disabled}
            onChange={e => selectChain(e.currentTarget.value)}
            aria-label="mcp swap chain"
            data-testid="mcp-swap-chain"
            style={SELECT_STYLE}
          >
            {options.map(option => (
              <option key={option.caip2} value={option.chain}>
                {option.chain}
              </option>
            ))}
          </select>
        </Col>
      </Row>

      <Row align="flex-end" css={{ gap: '$4', marginBottom: '$6' }}>
        <Col>
          <Text size={12} color="$gray600" css={{ marginBottom: '$2' }}>
            Sell
          </Text>
          <select
            value={from}
            disabled={disabled}
            onChange={e => selectFrom(e.currentTarget.value)}
            aria-label="mcp swap sell asset"
            data-testid="mcp-swap-from"
            style={SELECT_STYLE}
          >
            {assets.map(asset => (
              <option key={asset.symbol} value={asset.symbol}>
                {asset.symbol}
              </option>
            ))}
          </select>
        </Col>
        <Button
          light
          auto
          size="xs"
          disabled={disabled}
          icon={<SwapHorizIcon style={{ fontSize: 20 }} />}
          css={{ minWidth: 0, padding: '0 $2', color: '$gray600', flexShrink: 0 }}
          onClick={flip}
          aria-label="swap direction"
          data-testid="mcp-swap-flip"
        />
        <Col>
          <Text size={12} color="$gray600" css={{ marginBottom: '$2' }}>
            Buy
          </Text>
          <select
            value={to}
            disabled={disabled}
            onChange={e => selectTo(e.currentTarget.value)}
            aria-label="mcp swap buy asset"
            data-testid="mcp-swap-to"
            style={SELECT_STYLE}
          >
            {assets
              .filter(asset => asset.symbol !== from)
              .map(asset => (
                <option key={asset.symbol} value={asset.symbol}>
                  {asset.symbol}
                </option>
              ))}
          </select>
        </Col>
      </Row>

      <Input
        css={{ ...MCP_INPUT_CSS, marginBottom: '$6' }}
        label={`Amount in ${from}`}
        aria-label="mcp swap amount"
        placeholder={placeholderFor(from)}
        value={amount}
        disabled={disabled}
        onChange={e => setAmount(e.target.value.trim())}
        data-testid="mcp-swap-amount"
      />
      <McpFieldHint
        error={amountError}
        hint={cap ? `Up to ${cap} ${from} per transaction` : undefined}
      />

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
              {twoStep ? ' · approval + swap' : ''}
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
            Enter an amount to see a live Uniswap V3 quote from the deepest pool.
          </Text>
        ) : null}
      </div>

      <Button
        color="gradient"
        css={{ width: '100%' }}
        disabled={!amountValid || !pairValid || disabled}
        onClick={() => onPrepare({ chain, from, to, amount })}
        data-testid="mcp-swap-prepare"
      >
        Swap {from} → {to}
      </Button>
    </>
  )
}
