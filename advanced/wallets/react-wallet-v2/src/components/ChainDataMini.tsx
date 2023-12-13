import { COSMOS_MAINNET_CHAINS } from '@/data/COSMOSData'
import { EIP155_CHAINS } from '@/data/EIP155Data'
import { KADENA_CHAINS } from '@/data/KadenaData'
import { MULTIVERSX_CHAINS } from '@/data/MultiversxData'
import { NEAR_CHAINS } from '@/data/NEARData'
import { POLKADOT_CHAINS } from '@/data/PolkadotData'
import { SOLANA_CHAINS } from '@/data/SolanaData'
import { TEZOS_CHAINS } from '@/data/TezosData'
import { TRON_CHAINS } from '@/data/TronData'
import { getChainData } from '@/data/chainsUtil'
import { Card, Row, styled, Image, Avatar } from '@nextui-org/react'
import { ReactNode, useMemo } from 'react'

interface Props {
  chainId?: string // namespace + ":" + reference
}

// const StyledLogo = styled(Image, {})

export default function ChainDataMini({ chainId }: Props) {
  const chainData = useMemo(() => getChainData(chainId), [chainId])
  console.log(chainData)

  if (!chainData) return <></>
  return (
    <>
      <Row>
        <Avatar size={'xs'} src={chainData.logo} />
        <span style={{ marginLeft: '5px' }}>{chainData.name}</span>
      </Row>
    </>
  )
}
