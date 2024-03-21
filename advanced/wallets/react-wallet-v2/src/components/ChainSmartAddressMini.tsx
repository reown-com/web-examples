import ChainAddressMini from './ChainAddressMini'
import { Row, Spinner } from '@nextui-org/react'

type SmartAccount = {
  address: string
  type: string
}

interface Props {
  account: SmartAccount
}

export default function ChainSmartAddressMini({ account }: Props) {
  if (!account) return <Spinner />
  return (
    <Row>
      <Row>({account.type})</Row>
      <ChainAddressMini address={account.address} />
    </Row>
  )
}
