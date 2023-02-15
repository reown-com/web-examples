import AccountSelectCard from '@/components/AccountSelectCard'
import { Col, Row, Text } from '@nextui-org/react'

/**
 * Types
 */
interface IProps {
  chain: string
  addresses: string[]
  selectedAddresses: string[] | undefined
  onSelect: (chain: string, address: string) => void
}

/**
 * Component
 */
export default function ProposalSelectSection({
  addresses,
  selectedAddresses,
  chain,
  onSelect
}: IProps) {
  return (
    <Row>
      <Col>
        <Text h4 css={{ marginTop: '$5' }}>{`Choose ${chain} accounts`}</Text>
        {/* TODO(ilja) re-implement when duplicate optional namespaces are fixed */}
        {/* {addresses.map((address, index) => (
          <AccountSelectCard
            key={address}
            address={address}
            index={index}
            onSelect={() => onSelect(chain, address)}
            selected={selectedAddresses?.includes(address) ?? false}
          />
        ))} */}

        <AccountSelectCard
          key={addresses[0]}
          address={addresses[0]}
          index={1}
          onSelect={() => onSelect(chain, addresses[0])}
          selected={selectedAddresses?.includes(addresses[0]) ?? false}
        />
      </Col>
    </Row>
  )
}
