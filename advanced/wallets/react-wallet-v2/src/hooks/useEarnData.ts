/**
 * Hook to manage Earn data fetching and synchronization
 */

import { useEffect, useCallback } from 'react'
import { useSnapshot } from 'valtio'
import EarnStore from '@/store/EarnStore'
import SettingsStore from '@/store/SettingsStore'
import { fetchAllProtocolAPYs, getAllUserPositions, getUserTokenBalance } from '@/utils/EarnService'
import { PROTOCOL_CONFIGS } from '@/data/EarnProtocolsData'

export function useEarnData() {
  const { selectedChainId, selectedProtocol } = useSnapshot(EarnStore.state)
  const { eip155Address } = useSnapshot(SettingsStore.state)

  /**
   * Fetch and update protocol APYs
   */
  const refreshAPYs = useCallback(async () => {
    if (!selectedChainId) return

    try {
      const apyMap = await fetchAllProtocolAPYs(selectedChainId)

      // Update protocol configs with live APYs
      // Note: This would need a more sophisticated state management approach
      // For now, APYs are fetched but not persisted to the global state
      console.log('Fetched APYs:', Array.from(apyMap.entries()))
    } catch (error) {
      console.error('Error refreshing APYs:', error)
    }
  }, [selectedChainId])

  /**
   * Fetch and update user positions
   */
  const refreshPositions = useCallback(async () => {
    if (!eip155Address) return

    try {
      EarnStore.setPositionsLoading(true)
      const positions = await getAllUserPositions(eip155Address, selectedChainId)
      EarnStore.setPositions(positions)
    } catch (error) {
      console.error('Error refreshing positions:', error)
    } finally {
      EarnStore.setPositionsLoading(false)
    }
  }, [eip155Address, selectedChainId])

  /**
   * Fetch token balance for selected protocol
   */
  const refreshBalance = useCallback(async () => {
    if (!selectedProtocol || !eip155Address) return '0'

    try {
      const balance = await getUserTokenBalance(selectedProtocol, eip155Address)
      return balance
    } catch (error) {
      console.error('Error refreshing balance:', error)
      return '0'
    }
  }, [selectedProtocol, eip155Address])

  /**
   * Refresh all data
   */
  const refreshAllData = useCallback(async () => {
    await Promise.all([refreshAPYs(), refreshPositions()])
  }, [refreshAPYs, refreshPositions])

  // Auto-refresh on mount and when dependencies change
  useEffect(() => {
    refreshAllData()

    // Set up periodic refresh (every 30 seconds)
    const interval = setInterval(() => {
      refreshAllData()
    }, 30000)

    return () => clearInterval(interval)
  }, [refreshAllData])

  return {
    refreshAPYs,
    refreshPositions,
    refreshBalance,
    refreshAllData
  }
}

export default useEarnData
