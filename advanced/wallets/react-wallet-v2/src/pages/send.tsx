import PageHeader from '@/components/PageHeader'
import StyledDivider from '@/components/StyledDivider'
import { EIP155_MAINNET_CHAINS } from '@/data/EIP155Data'
import SettingsStore from '@/store/SettingsStore'
import { getErc20TokensForChain, sendErc20 } from '@/utils/EIP155SendUtil'
import { isE2ESeededWallet } from '@/utils/EIP155WalletUtil'
import { getAmountError } from '@/utils/Erc20AmountUtil'
import { Button, Input, Loading, Row, Text } from '@nextui-org/react'
import { useRouter } from 'next/router'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'
import { isAddress } from 'viem'

const DEFAULT_CHAIN_ID = 'eip155:8453'
const HEX_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/

function readQueryParam(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function getRecipientError(to: string): string | undefined {
  if (!to || isAddress(to)) return undefined
  if (HEX_ADDRESS_PATTERN.test(to)) {
    return 'Recipient address has an invalid checksum: use all-lowercase or the EIP-55 form'
  }

  return 'Invalid recipient address'
}

export default function SendPage() {
  const { eip155Address } = useSnapshot(SettingsStore.state)
  const { query, isReady } = useRouter()

  const [chainId, setChainId] = useState(DEFAULT_CHAIN_ID)
  // Token picked in the dropdown; empty until the user changes it.
  const [pickedToken, setPickedToken] = useState('')
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [txHash, setTxHash] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const autoSubmitted = useRef(false)
  const prefilled = useRef(false)

  const tokens = useMemo(() => getErc20TokensForChain(chainId), [chainId])
  const initialized = Boolean(eip155Address)

  /* The query only prefills the wallet the E2E harness seeded from `e2e_encrypted`:
     this is a public demo wallet where people import their own mnemonic, and a
     crafted link must never hand them a one-click (or `?auto=1`, zero-click)
     transfer to an attacker's address. */
  const e2eSeeded = initialized && isE2ESeededWallet()
  const autoSubmit = readQueryParam(query.auto) === '1' && e2eSeeded

  /* Derived rather than synced through effects: the dropdown pick wins, then the
     query token, then the chain's first token. A prefilled token from another
     chain simply falls through. */
  const queryToken = readQueryParam(query.token)
  const token = useMemo(() => {
    const candidate = [pickedToken, queryToken].find(
      value => value && tokens.some(option => option.address.toLowerCase() === value.toLowerCase())
    )

    return candidate ?? tokens[0]?.address ?? ''
  }, [pickedToken, queryToken, tokens])

  const decimals = tokens.find(option => option.address === token)?.decimals ?? 0
  const recipientError = getRecipientError(to)
  const amountError = amount ? getAmountError(amount, decimals) : undefined

  const inputsValid =
    Boolean(token) && Boolean(to) && Boolean(amount) && !recipientError && !amountError
  const canSubmit = initialized && inputsValid && !sending

  // Prefill once the router has parsed the query string and the wallet is known.
  useEffect(() => {
    if (!isReady || !initialized || prefilled.current) return
    prefilled.current = true

    const chainParam = readQueryParam(query.chain)
    if (chainParam && EIP155_MAINNET_CHAINS[chainParam]) {
      setChainId(chainParam)
    }

    if (!e2eSeeded) return

    const toParam = readQueryParam(query.to)
    if (toParam) {
      setTo(toParam)
    }

    const amountParam = readQueryParam(query.amount)
    if (amountParam) {
      setAmount(amountParam)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, initialized])

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
          onChange={e => setPickedToken(e.currentTarget.value)}
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

      {error || recipientError || amountError ? (
        <Text
          css={{ marginTop: '$10', wordBreak: 'break-all' }}
          color="error"
          data-testid="send-error"
        >
          {error || recipientError || amountError}
        </Text>
      ) : null}
    </Fragment>
  )
}
