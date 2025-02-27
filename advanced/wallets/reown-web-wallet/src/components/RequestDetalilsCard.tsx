import { EIP155_CHAINS, TEIP155Chain } from '@/data/EIP155Data'
import { Col, Divider, Row, Text } from '@nextui-org/react'
import { Fragment } from 'react'

/**
 * Types
 */
interface IProps {
  chains: string[]
  protocol: string
}

/**
 * Component
 */
export default function RequestDetailsCard({ chains, protocol }: IProps) {
  return (
    <Fragment>
      <Row>
        <Col>
          <Text h5>Blockchain(s)</Text>
          <Text color="$gray400" data-testid="request-details-chain">
            {chains
              .map(
                chain =>
                  EIP155_CHAINS[chain as TEIP155Chain]?.name ??
                  chain
              )
              .join(', ')}
          </Text>
        </Col>
      </Row>

      <Divider y={2} />

      <Row>
        <Col>
          <Text h5>Relay Protocol</Text>
          <Text color="$gray400" data-testid="request-detauls-realy-protocol">
            {protocol}
          </Text>
        </Col>
      </Row>
    </Fragment>
  )
}
