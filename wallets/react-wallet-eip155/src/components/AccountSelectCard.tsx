import { truncate } from '@/utils/HelperUtil'
import { Card, Checkbox, Row, Text } from '@nextui-org/react'

/**
 * Types
 */
interface IProps {
  address: string
  index: number
  selected: boolean
  onSelect: () => void
}

/**
 * Component
 */
export default function AccountSelectCard({ address, selected, index, onSelect }: IProps) {
  return (
    <Card
      onPress={onSelect}
      isPressable
      key={address}
      css={{
        marginTop: '$5',
        backgroundColor: selected ? 'rgba(23, 200, 100, 0.2)' : '$accents2',
        padding: '10px 20px'
      }}
    >
      <Row justify="space-between" align="center">
        <Checkbox size="lg" color="success" isSelected={selected} onChange={onSelect} />
        <Text>{`${truncate(address, 14)} - Account ${index + 1}`} </Text>
      </Row>
    </Card>
  )
}
