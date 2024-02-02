import ChainCard from '@/components/ChainCard'
import SettingsStore from '@/store/SettingsStore'
import { styledToast, truncate } from '@/utils/HelperUtil'
import { updateSignClientChainId } from '@/utils/WalletConnectUtil'
import { Avatar, Button, Text, Tooltip, Loading } from '@nextui-org/react'
import { eip155Wallets } from '@/utils/EIP155WalletUtil'
import Image from 'next/image'
import { useState } from 'react'
import { useSnapshot } from 'valtio'
import useSmartAccount from '@/hooks/useSmartAccount'
import { Chain, FAUCET_URLS, allowedChains } from '@/utils/SmartAccountUtils'

interface Props {
  name: string
  logo: string
  rgb: string
  address: string
  chainId: string
  isActiveChain: boolean
}

export default function SmartAccountCard({
  name,
  logo,
  rgb,
  address = '',
  chainId,
  isActiveChain
}: Props) {
  const [copied, setCopied] = useState(false)
  const { activeChainId } = useSnapshot(SettingsStore.state)
  const chain = allowedChains.find((c) => c.id.toString() === chainId.split(':')[1]) as Chain
  const {
    deploy,
    isDeployed,
    address: smartAccountAddress,
    loading,
    sendTestTransaction,
  } = useSmartAccount(eip155Wallets[address].getPrivateKey() as `0x${string}`, chain)

  function onCopy() {
    navigator?.clipboard?.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function onChainChanged(chainId: string, address: string) {
    SettingsStore.setActiveChainId(chainId)
    await updateSignClientChainId(chainId.toString(), address)
  }

  async function onCreateSmartAccount() {
    try {
      if (!isDeployed) {
        await deploy()
      }
    } catch (error) {
      console.error(error)
    }
  }
  
  return (
    <ChainCard rgb={rgb} flexDirection="row" alignItems="center" flexWrap="wrap">
      <Avatar src={logo} />
      <div style={{ flex: 1 }}>
        <Text h5 css={{ marginLeft: '$9' }}>
          {name}
        </Text>
        <Text weight="light" size={13} css={{ marginLeft: '$9' }}>
          {address ? truncate(address, 19) : '<no address available>'}
        </Text>
      </div>

      <Tooltip content={copied ? 'Copied!' : 'Copy'} placement="left">
        <Button
          size="sm"
          css={{ minWidth: 'auto', backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
          data-testid={'chain-copy-button' + chainId}
          onClick={onCopy}
        >
          <Image
            src={copied ? '/icons/checkmark-icon.svg' : '/icons/copy-icon.svg'}
            width={15}
            height={15}
            alt="copy icon"
          />
        </Button>
      </Tooltip>
      <Button
        size="sm"
        css={{
          minWidth: 'auto',
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          marginLeft: '$5'
        }}
        data-testid={'chain-switch-button' + chainId}
        onPress={() => {
          onChainChanged(chainId, address)
        }}
      >
        {activeChainId === chainId ? `✅` : `🔄`}
      </Button>
      {smartAccountAddress ? (
        <>
          <Text h5 css={{ marginTop: 20 }}>
            Smart Account:
          </Text>
          <Text small css={{ marginTop: 5 }}>
            {smartAccountAddress}
          </Text>
        </>
      ) : null}
      {isDeployed && smartAccountAddress ? (
        <Button
          size="md"
          css={{ marginTop: 20, width: '100%' }}
          onClick={sendTestTransaction}
          disabled={!isActiveChain || loading}
        >
          {loading ? <Loading size="sm" /> : 'Send Test TX'}
        </Button>
      ) : (
        <>
          <Button
            disabled={!isActiveChain || loading}
            size="sm"
            css={{ marginTop: 20, width: '100%' }}
            onClick={() => window.open(FAUCET_URLS[chain?.name], '_blank')}
          >
            {name} Faucet
          </Button>
          <Button
            disabled={!isActiveChain || loading}
            size="sm"
            css={{ marginTop: 10, width: '100%' }}
            onClick={onCreateSmartAccount}
          >
            {loading ? <Loading size="sm" css={{ paddingTop: 10 }} /> : 'Create Smart Account'}
          </Button>
        </>
      )}
    </ChainCard>
  )
}
