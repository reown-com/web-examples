import ChainCard from '@/components/ChainCard'
import BalanceOverviewCard from '@/components/BalanceOverviewCard'
import SettingsStore from '@/store/SettingsStore'
import { truncate } from '@/utils/HelperUtil'
import { updateSignClientChainId } from '@/utils/WalletConnectUtil'
import { Avatar, Button, Text, Tooltip, Loading } from '@nextui-org/react'
import Image from 'next/image'
import { useState, useCallback } from 'react'
import { useSnapshot } from 'valtio'

interface Props {
  name: string
  logo: string
  rgb: string
  address: string
  chainId: string
}

export default function AccountCard({ name, logo, rgb, address = '', chainId }: Props) {
  const [copied, setCopied] = useState(false)
  const [showBalance, setShowBalance] = useState(false)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const { activeChainId } = useSnapshot(SettingsStore.state)

  function onCopy() {
    navigator?.clipboard?.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function onChainChanged(chainId: string, address: string) {
    SettingsStore.setActiveChainId(chainId)
    await updateSignClientChainId(chainId.toString(), address)
  }

  const handleBalanceClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowBalance(!showBalance)
  }

  const handleBalanceLoadingChange = useCallback((loading: boolean) => {
    setBalanceLoading(loading)
  }, [])

  return (
    <ChainCard rgb={rgb} flexDirection="column" alignItems="stretch">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Avatar src={logo} />
        <div style={{ flex: 1 }}>
          <Text h5 css={{ marginLeft: '$9' }}>
            {name}
          </Text>
          <Text weight="light" size={13} css={{ marginLeft: '$9' }}>
            {address ? truncate(address, 19) : '<no address available>'}
          </Text>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Tooltip content={showBalance ? 'Hide balance' : 'Show balance'} placement="left">
            <Button
              size="sm"
              css={{
                minWidth: 'auto',
                backgroundColor: showBalance ? 'rgba(23, 201, 100, 0.3)' : 'rgba(255, 255, 255, 0.15)'
              }}
              data-testid={'chain-balance-button' + chainId}
              onClick={handleBalanceClick}
            >
              {balanceLoading ? <Loading size="xs" color="white" /> : '💰'}
            </Button>
          </Tooltip>
          <Tooltip content={copied ? 'Copied!' : 'Copy'} placement="left">
            <Button
              size="sm"
              css={{ minWidth: 'auto', backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
              data-testid={'chain-copy-button' + chainId}
              onClick={e => {
                e.stopPropagation()
                onCopy()
              }}
            >
              <Image
                src={copied ? '/icons/checkmark-icon.svg' : '/icons/copy-icon.svg'}
                width={15}
                height={15}
                alt="copy icon"
              />
            </Button>
          </Tooltip>
          <Tooltip content={activeChainId === chainId ? 'Active chain' : 'Switch chain'} placement="left">
            <Button
              size="sm"
              css={{ minWidth: 'auto', backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
              data-testid={'chain-switch-button' + chainId}
              onClick={e => {
                e.stopPropagation()
                onChainChanged(chainId, address)
              }}
            >
              {activeChainId === chainId ? `✅` : `🔄`}
            </Button>
          </Tooltip>
        </div>
      </div>
      {showBalance && (
        <BalanceOverviewCard
          chainId={chainId}
          address={address}
          onLoadingChange={handleBalanceLoadingChange}
        />
      )}
    </ChainCard>
  )
}
