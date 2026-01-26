import { Loading, Text, Avatar, Button } from '@nextui-org/react'
import { useEffect, useState, useCallback, useRef } from 'react'
import { fetchAllBalances, AllBalancesResult, BalanceResult } from '@/utils/BalanceUtil'
import { getChainData } from '@/data/chainsUtil'

interface Props {
  chainId: string
  address: string
  onLoadingChange?: (loading: boolean) => void
}

const styles = {
  container: {
    marginTop: '8px',
    marginLeft: '36px',
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)'
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0'
  },
  tokenInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px'
  }
}

function BalanceRow({ balance, isNative }: { balance: BalanceResult; isNative?: boolean }) {
  return (
    <div style={styles.row}>
      <div style={styles.tokenInfo}>
        {balance.icon && (
          <Avatar src={balance.icon} size="xs" css={{ width: '16px', height: '16px' }} />
        )}
        <Text size={12} css={{ color: '$accents7' }}>
          {isNative ? 'Native' : balance.symbol}
        </Text>
      </div>
      <Text size={12} css={{ fontWeight: '600', color: '$success' }}>
        {balance.balanceFormatted} {balance.symbol}
      </Text>
    </div>
  )
}

export default function BalanceOverviewCard({ chainId, address, onLoadingChange }: Props) {
  const [balances, setBalances] = useState<AllBalancesResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchInProgress = useRef(false)

  const chainData = getChainData(chainId) as { logo?: string } | undefined
  const chainLogo = chainData?.logo

  const fetchBalance = useCallback(async () => {
    if (!address) {
      setLoading(false)
      setError('No address provided')
      onLoadingChange?.(false)
      return
    }

    // Debounce: prevent concurrent fetches
    if (fetchInProgress.current) {
      return
    }

    fetchInProgress.current = true
    setLoading(true)
    setError(null)
    onLoadingChange?.(true)

    try {
      const result = await fetchAllBalances(address, chainId)
      setBalances(result)
      // Check if native balance has an error
      if (result.native.error) {
        setError(result.native.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch balance')
    } finally {
      setLoading(false)
      fetchInProgress.current = false
      onLoadingChange?.(false)
    }
  }, [address, chainId, onLoadingChange])

  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <Loading size="xs" />
          <Text size={12}>Loading balances...</Text>
        </div>
      </div>
    )
  }

  if (error && !balances) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <Text size={12} css={{ color: '$error' }}>
            Unable to fetch balance
          </Text>
          <Button
            size="xs"
            css={{ minWidth: 'auto', fontSize: '11px' }}
            onClick={fetchBalance}
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!balances) {
    return null
  }

  return (
    <div style={styles.container}>
      <BalanceRow balance={{ ...balances.native, icon: chainLogo }} isNative />
      {balances.tokens.map(token => (
        <BalanceRow key={token.symbol} balance={token} />
      ))}
    </div>
  )
}
