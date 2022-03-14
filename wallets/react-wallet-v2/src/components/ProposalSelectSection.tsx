import AccountSelectCard from '@/components/AccountSelectCard'
import { Col, Divider, Row, Text } from '@nextui-org/react'
import { Fragment } from 'react'

/**
 * Types
 */
interface IProps {
  name: string
  chain: string
  addresses: string[]
  selectedAddresses: string[]
  onSelect: (address: string) => void
}

/**
 * Component
 */
export default function ProposalSelectSection({
  name,
  addresses,
  selectedAddresses,
  chain,
  onSelect
}: IProps) {
  return (
    <Fragment>
      <Divider y={2} />

      <Row>
        <Col>
          <Text h5>{`Select ${name} Accounts`}</Text>
          {addresses.map((address, index) => (
            <AccountSelectCard
              key={address}
              address={address}
              index={index}
              onSelect={() => onSelect(`${chain}:${address}`)}
              selected={selectedAddresses.includes(`${chain}:${address}`)}
            />
          ))}
        </Col>
      </Row>
    </Fragment>
  )
}
