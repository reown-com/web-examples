import ChainCard from '@/components/ChainCard'
import SettingsStore from '@/store/SettingsStore'
import { eip155Addresses } from '@/utils/EIP155WalletUtil'
import { truncate } from '@/utils/HelperUtil'
import { Avatar, Button, Text, Tooltip } from '@nextui-org/react'
import Image from 'next/image'
import { useState } from 'react'
import { useSnapshot } from 'valtio'

interface Props {
  name: string
  logo: string
  rgb: string
  address: string
  chainId: string
}

export default function AccountCard({ name, logo, rgb, address, chainId }: Props) {
  const [copied, setCopied] = useState(false)
  const { activeChainId, account, activeSession } = useSnapshot(
    SettingsStore.state,
  );
  function onCopy() {
    navigator?.clipboard?.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function onChainChanged(_chainId: string) {
    SettingsStore.setActiveChainId(_chainId);
    console.log(`onChainChanged: ${_chainId}`);
    // await web3wallet.updateSession({
    //   accounts: [eip155Addresses[account]],
    //   chainId: _chainId,
    //   topic: activeSession,
    // });
  }

  return (
    <ChainCard rgb={rgb} flexDirection="row" alignItems="center">
      <Avatar src={logo} />
      <div style={{ flex: 1 }}>
        <Text h5 css={{ marginLeft: '$9' }}>
          {name}
        </Text>
        <Text weight="light" size={13} css={{ marginLeft: '$9' }}>
          {truncate(address, 19)}
        </Text>
      </div>

      <Tooltip content={copied ? 'Copied!' : 'Copy'} placement="left">
        <Button
          size="sm"
          css={{ minWidth: 'auto', backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
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
          minWidth: "auto",
          backgroundColor: "rgba(255, 255, 255, 0.15)",
          marginLeft: "$5",
        }}
        onPress={() => {
          onChainChanged(chainId);
        }}
      >
        {activeChainId === chainId ? `✅` : `🔄`}
      </Button>
    </ChainCard>
  )
}
