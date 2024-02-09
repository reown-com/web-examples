import useSmartAccount from '@/hooks/useSmartAccount'
import { Hex } from 'viem'
import ChainAddressMini from './ChainAddressMini'
import { createOrRestoreEIP155Wallet, eip155Wallets } from '@/utils/EIP155WalletUtil'
import { Spinner } from '@nextui-org/react'
import { Chain, allowedChains } from '@/utils/SmartAccountUtils'

interface Props {
  chain: {
    chainId: string;
    name: string;
    logo: string;
    rgb: string;
    namespace: string;
  } | undefined
}

const getKey = (namespace?: string) => {
  switch (namespace) {
    case 'eip155':
      createOrRestoreEIP155Wallet()
      const key = Object.values(eip155Wallets)[0]?.getPrivateKey() as Hex
      return key
  }
}

export default function ChainSmartAddressMini({chain}: Props) {
  const { address } = useSmartAccount(
    getKey(chain?.namespace) as `0x${string}`, 
    allowedChains.find((c) => c.id.toString() === chain?.chainId.toString()) as Chain
  )
  if (!address) return <Spinner />
  return (
      <ChainAddressMini address={address}/>
  )
}
