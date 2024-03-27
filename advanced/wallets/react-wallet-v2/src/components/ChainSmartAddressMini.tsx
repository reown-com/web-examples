import ChainAddressMini from './ChainAddressMini'
import { Button, Col, Row, Spinner, Text, Tooltip } from '@nextui-org/react'
import InfoIcon from '@mui/icons-material/Info'

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
      <Col>
        <Text style={{ marginLeft: '5px' }}>({account.type})</Text>
        <ChainAddressMini address={account.address} />
      </Col>
    </Row>
  )
}
