/**
 * Hook to manage Earn data fetching and synchronization
 */

import { useEffect, useCallback } from 'react'
import { useSnapshot } from 'valtio'
import EarnStore from '@/store/EarnStore'
import SettingsStore from '@/store/SettingsStore'
import {
  fetchAllProtocolAPYs,
  fetchAllProtocolTVLs,
  getAllUserPositions,
  getUserTokenBalance
} from '@/utils/EarnService'
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
      console.log('Refreshing APYs for chain', selectedChainId)
      const apyMap = await fetchAllProtocolAPYs(selectedChainId)

      // Store APYs in the store
      apyMap.forEach((apy, key) => {
        const [protocolId, chainIdStr] = key.split('-')
        EarnStore.setAPY(protocolId, parseInt(chainIdStr), apy)
      })

      console.log('APY refresh complete:', Array.from(apyMap.entries()))
    } catch (error) {
      console.error('Error refreshing APYs:', error)
    }
  }, [selectedChainId])

  /**
   * Fetch and update protocol TVLs
   */
  const refreshTVLs = useCallback(async () => {
    if (!selectedChainId) return

    try {
      console.log('Refreshing TVLs for chain', selectedChainId)
      const tvlMap = await fetchAllProtocolTVLs(selectedChainId)

      // Store TVLs in the store
      tvlMap.forEach((tvl, key) => {
        const [protocolId, chainIdStr] = key.split('-')
        EarnStore.setTVL(protocolId, parseInt(chainIdStr), tvl)
      })

      console.log('TVL refresh complete:', Array.from(tvlMap.entries()))
    } catch (error) {
      console.error('Error refreshing TVLs:', error)
    }
  }, [selectedChainId])

  /**
   * Fetch and update user positions
   */
  const refreshPositions = useCallback(async () => {
    if (!eip155Address) return

    // Prevent multiple simultaneous calls
    if (EarnStore.state.positionsLoading) {
      console.log('Already loading positions, skipping...')
      return
    }

    try {
      EarnStore.setPositionsLoading(true)
      console.log('Fetching positions for:', eip155Address, 'chain:', selectedChainId)
      const positions = await getAllUserPositions(eip155Address, selectedChainId)
      EarnStore.setPositions(positions)
      console.log('Positions loaded:', positions.length)
    } catch (error) {
      console.error('Error refreshing positions:', error)
    } finally {
      EarnStore.setPositionsLoading(false)
    }
  }, [eip155Address, selectedChainId])

  /**
   * Fetch token balance for selected protocol
   */
  const refreshBalance = useCallback(
    async (skipCache: boolean = false) => {
      if (!selectedProtocol || !eip155Address) return '0'

      try {
        const balance = await getUserTokenBalance(selectedProtocol, eip155Address, skipCache)
        return balance
      } catch (error) {
        console.error('Error refreshing balance:', error)
        return '0'
      }
    },
    [selectedProtocol, eip155Address]
  )

  /**
   * Refresh all data
   */
  const refreshAllData = useCallback(async () => {
    await Promise.all([refreshAPYs(), refreshTVLs(), refreshPositions()])
  }, [refreshAPYs, refreshTVLs, refreshPositions])

  // Auto-fetch APYs and TVLs on mount (with 2-minute cache, safe from spam)
  useEffect(() => {
    refreshAPYs()
    refreshTVLs()
  }, [refreshAPYs, refreshTVLs])

  return {
    refreshAPYs,
    refreshTVLs,
    refreshPositions,
    refreshBalance,
    refreshAllData
  }
}

export default useEarnData
