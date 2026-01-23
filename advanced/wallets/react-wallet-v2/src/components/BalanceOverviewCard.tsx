import { Loading, Text, Avatar } from '@nextui-org/react'
import { useEffect, useState, useCallback } from 'react'
import { fetchAllBalances, AllBalancesResult, BalanceResult } from '@/utils/BalanceUtil'

interface Props {
  chainId: string
  address: string
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

export default function BalanceOverviewCard({ chainId, address }: Props) {
  const [balances, setBalances] = useState<AllBalancesResult | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchBalance = useCallback(async () => {
    if (!address) {
      setLoading(false)
      return
    }

    setLoading(true)
    const result = await fetchAllBalances(address, chainId)
    setBalances(result)
    setLoading(false)
  }, [address, chainId])

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

  if (!balances) {
    return null
  }

  return (
    <div style={styles.container}>
      <BalanceRow balance={balances.native} isNative />
      {balances.tokens.map(token => (
        <BalanceRow key={token.symbol} balance={token} />
      ))}
    </div>
  )
}
