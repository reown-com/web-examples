import ChainAddressMini from './ChainAddressMini'
import { Row, Spinner } from '@nextui-org/react'
import SettingsStore from '@/store/SettingsStore'
import { useSnapshot } from 'valtio'

interface Props {
  chain:
    | {
        chainId: string
        name: string
        logo: string
        rgb: string
        namespace: string
      }
    | undefined
}

export default function ChainSmartAddressMini({ chain }: Props) {
  const { kernelSmartAccountAddress } = useSnapshot(SettingsStore.state)

  if (!kernelSmartAccountAddress) return <Spinner />
  return (
    <Row>
      <Row>(Kernel)</Row>
      <ChainAddressMini address={kernelSmartAccountAddress} />
    </Row>
  )
}
