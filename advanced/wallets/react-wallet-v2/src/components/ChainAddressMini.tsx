import { cosmosAddresses } from '@/utils/CosmosWalletUtil'
import { eip155Addresses } from '@/utils/EIP155WalletUtil'
import { polkadotAddresses } from '@/utils/PolkadotWalletUtil'
import { multiversxAddresses } from '@/utils/MultiversxWalletUtil'
import { tronAddresses } from '@/utils/TronWalletUtil'
import { tezosAddresses } from '@/utils/TezosWalletUtil'
import { solanaAddresses } from '@/utils/SolanaWalletUtil'
import { nearAddresses } from '@/utils/NearWalletUtil'
import { kadenaAddresses } from '@/utils/KadenaWalletUtil'
import { useMemo } from 'react'
import { Row } from '@nextui-org/react'
import { getChainData } from '@/data/chainsUtil'

interface Props {
  address?: string
}

export default function ChainAddressMini({ address }: Props) {
  if (!address) return <></>
  return (
    <>
      <Row>
        <span style={{ marginLeft: '5px' }}>
          {address.substring(0, 6)}...{address.substring(address.length - 6)}
        </span>
      </Row>
    </>
  )
}
