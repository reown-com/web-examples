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
  onDelete: (address: string) => void
  onAdd: (address: string) => void
}

/**
 * Component
 */
export default function SessionSelectSection({
  name,
  addresses,
  chain,
  selectedAddresses,
  onDelete,
  onAdd
}: IProps) {
  return (
    <Fragment>
      <Divider y={2} />

      <Row>
        <Col>
          <Text h5>{`${name} Accounts`}</Text>
          {addresses.map((address, index) => {
            const fullAddress = `${chain}:${address}`
            const selected = selectedAddresses.includes(fullAddress)

            return (
              <AccountSelectCard
                key={address}
                address={address}
                index={index}
                onSelect={() => (selected ? onDelete(fullAddress) : onAdd(fullAddress))}
                selected={selected}
              />
            )
          })}
        </Col>
      </Row>
    </Fragment>
  )
}
