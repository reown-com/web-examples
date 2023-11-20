import ChainCard from '@/components/ChainCard'
import SettingsStore from '@/store/SettingsStore'
import { truncate } from '@/utils/HelperUtil'
import { updateSignClientChainId } from '@/utils/WalletConnectUtil'
import { Avatar, Button, Text, Tooltip, Loading } from '@nextui-org/react'
import { eip155Wallets } from '@/utils/EIP155WalletUtil'
import Image from 'next/image'
import { useState } from 'react'
import { useSnapshot } from 'valtio'
import { createSmartAccount } from '@/lib/SmartAccountLib'

interface Props {
  name: string
  logo: string
  rgb: string
  address: string
  chainId: string
  isSmartAccount?: boolean
}

export default function AccountCard({
  name,
  logo,
  rgb,
  address = '',
  chainId,
  isSmartAccount
}: Props) {
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
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

  async function onCreateSmartAccount() {
    try {
      setLoading(true)
      const privateKey = eip155Wallets[address].getPrivateKey() as `0x${string}`
      const smartAccount = await createSmartAccount(privateKey)
      console.log(smartAccount)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
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

      {isSmartAccount ? (
        loading ? (
          <Loading />
        ) : (
          <Button size="sm" css={{ marginTop: 20, width: '100%' }} onClick={onCreateSmartAccount}>
            Create Smart Account
          </Button>
        )
      ) : null}
    </ChainCard>
  )
}
