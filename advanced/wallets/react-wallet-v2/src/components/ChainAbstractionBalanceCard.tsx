import SettingsStore from '@/store/SettingsStore'
import { getChainById } from '@/utils/ChainUtil'
import {
  getErc20TokenBalance,
  supportedAssets as multibridgeSupportedAssets
} from '@/utils/MultibridgeUtil'
import { Collapse, Loading, Text } from '@nextui-org/react'
import { useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'
import { Hex } from 'viem'

export default function ChainAbstractionBalanceCard() {
  const { eip155Address } = useSnapshot(SettingsStore.state)
  const [balances, setBalances] = useState<Record<string, Record<string, number>>>({})
  const [totalBalance, setTotalBalance] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const fetchAllBalances = async () => {
      setLoading(true)

      const fetchedBalances: Record<string, any> = {}
      for (const asset of Object.keys(multibridgeSupportedAssets)) {
        const assetBalances: Record<string, number> = {}
        for (const chainId of Object.keys(multibridgeSupportedAssets[asset])) {
          const tokenAddress = multibridgeSupportedAssets[asset][Number(chainId)]
          const balance = await getErc20TokenBalance(
            tokenAddress as Hex,
            Number(chainId),
            eip155Address as Hex
          )
          assetBalances[chainId] = balance
        }
        fetchedBalances[asset] = assetBalances
      }
      setBalances(fetchedBalances)
      setLoading(false)
    }
    fetchAllBalances()
  }, [eip155Address])

  useEffect(() => {
    const totalBalances: Record<string, number> = {}
    for (const asset of Object.keys(balances)) {
      let total = 0
      for (const chainBalance of Object.values(balances[asset])) {
        total += chainBalance
      }
      totalBalances[asset] = total
    }
    setTotalBalance(totalBalances)
  }, [balances])

  return (
    <>
      <Text h4 css={{ marginBottom: '$5' }}>
        Token Assets (CA)
      </Text>
      {loading ? (
        <Loading />
      ) : (
        <Collapse.Group accordion={false}>
          {Object.keys(balances).map(asset => {
            return (
              <Collapse
                title={
                  <Text weight="semibold">
                    {asset} - {totalBalance[asset]}
                  </Text>
                }
                key={asset}
              >
                {Object.keys(balances[asset]).map(chainId => {
                  const chain = getChainById(Number(chainId))
                  return (
                    <Text key={asset + '-' + chainId}>
                      {chain.name} - {balances[asset][chainId]}
                    </Text>
                  )
                })}
              </Collapse>
            )
          })}
        </Collapse.Group>
      )}
    </>
  )
}
