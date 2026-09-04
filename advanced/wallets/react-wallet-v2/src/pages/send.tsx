import PageHeader from '@/components/PageHeader'
import StyledDivider from '@/components/StyledDivider'
import { EIP155_MAINNET_CHAINS } from '@/data/EIP155Data'
import SettingsStore from '@/store/SettingsStore'
import { AMOUNT_PATTERN, getErc20TokensForChain, sendErc20 } from '@/utils/EIP155SendUtil'
import { isE2ESeededWallet } from '@/utils/EIP155WalletUtil'
import { Button, Input, Loading, Row, Text } from '@nextui-org/react'
import { useRouter } from 'next/router'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'
import { isAddress } from 'viem'

const DEFAULT_CHAIN_ID = 'eip155:8453'

function readQueryParam(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined
}

export default function SendPage() {
  const { eip155Address } = useSnapshot(SettingsStore.state)
  const { query, isReady } = useRouter()

  const [chainId, setChainId] = useState(DEFAULT_CHAIN_ID)
  const [token, setToken] = useState('')
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [txHash, setTxHash] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const autoSubmitted = useRef(false)

  const tokens = useMemo(() => getErc20TokensForChain(chainId), [chainId])
  const initialized = Boolean(eip155Address)
  const tokenKnown = tokens.some(option => option.address.toLowerCase() === token.toLowerCase())

  /* Unattended submits are for the E2E wallet only: this is a public demo wallet
     where people import their own mnemonic, and a crafted `?auto=1` link would
     otherwise drain them without a single click. */
  const autoSubmit = readQueryParam(query.auto) === '1' && isE2ESeededWallet()

  const inputsValid =
    tokenKnown && isAddress(to) && AMOUNT_PATTERN.test(amount) && parseFloat(amount) > 0
  const canSubmit = initialized && inputsValid && !sending

  // Prefill once the router has parsed the query string.
  useEffect(() => {
    if (!isReady) return

    const chainParam = readQueryParam(query.chain)
    if (chainParam && EIP155_MAINNET_CHAINS[chainParam]) {
      setChainId(chainParam)
    }

    const tokenParam = readQueryParam(query.token)
    if (tokenParam) {
      setToken(tokenParam)
    }

    const toParam = readQueryParam(query.to)
    if (toParam) {
      setTo(toParam)
    }

    const amountParam = readQueryParam(query.amount)
    if (amountParam) {
      setAmount(amountParam)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady])

  /* Keep the token selection consistent with the chain: a token prefilled for
     another chain (or none at all) falls back to the chain's first token. */
  useEffect(() => {
    if (!tokenKnown) {
      setToken(tokens[0]?.address ?? '')
    }
  }, [tokens, tokenKnown])

  const onSend = useCallback(async () => {
    setSending(true)
    setError('')
    setTxHash('')
    try {
      const { hash } = await sendErc20({ chainId, token, to, amount })
      setTxHash(hash)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSending(false)
    }
  }, [chainId, token, to, amount])

  useEffect(() => {
    if (!autoSubmit || autoSubmitted.current || !canSubmit) return
    autoSubmitted.current = true
    onSend()
  }, [autoSubmit, canSubmit, onSend])

  return (
    <Fragment>
      <PageHeader title="Send" />

      <Text h4 css={{ marginBottom: '$5' }}>
        Chain
      </Text>
      <select
        value={chainId}
        onChange={e => setChainId(e.currentTarget.value)}
        disabled={!initialized || sending}
        aria-label="send chain"
        data-testid="send-chain-select"
      >
        {Object.entries(EIP155_MAINNET_CHAINS).map(([caip2, chain]) => (
          <option key={caip2} value={caip2}>
            {chain.name}
          </option>
        ))}
      </select>

      <StyledDivider css={{ my: '$8' }} />

      <Text h4 css={{ marginBottom: '$5' }}>
        Token
      </Text>
      {tokens.length ? (
        <select
          value={token}
          onChange={e => setToken(e.currentTarget.value)}
          disabled={!initialized || sending}
          aria-label="send token"
          data-testid="send-token-select"
        >
          {tokens.map(option => (
            <option key={option.address} value={option.address}>
              {option.symbol}
            </option>
          ))}
        </select>
      ) : (
        <Text color="$gray400">No known ERC-20 tokens on this chain</Text>
      )}

      <StyledDivider css={{ my: '$8' }} />

      <Input
        css={{ width: '100%', marginBottom: '$8' }}
        bordered
        label="Recipient"
        aria-label="send recipient input"
        placeholder="0x..."
        value={to}
        disabled={!initialized || sending}
        onChange={e => setTo(e.target.value)}
        data-testid="send-to-input"
      />

      <Input
        css={{ width: '100%', marginBottom: '$8' }}
        bordered
        label="Amount"
        aria-label="send amount input"
        placeholder="e.g. 1.5"
        value={amount}
        disabled={!initialized || sending}
        onChange={e => setAmount(e.target.value)}
        data-testid="send-amount-input"
      />

      <Row justify="center">
        <Button
          color="gradient"
          disabled={!canSubmit}
          onClick={onSend}
          data-testid="send-submit-button"
        >
          {sending ? <Loading size="sm" type="points" color="white" /> : 'Send'}
        </Button>
      </Row>

      {txHash ? (
        <Text
          css={{ marginTop: '$10', wordBreak: 'break-all' }}
          color="success"
          data-testid="send-tx-hash"
        >
          {txHash}
        </Text>
      ) : null}

      {error ? (
        <Text
          css={{ marginTop: '$10', wordBreak: 'break-all' }}
          color="error"
          data-testid="send-error"
        >
          {error}
        </Text>
      ) : null}
    </Fragment>
  )
}
