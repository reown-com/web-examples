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
  isRequired: boolean
}

/**
 * Component
 */
export default function AccountSelectCard({ address, selected, index, onSelect, isRequired }: IProps) {
  return (
    <Card
      onClick={onSelect}
      clickable
      key={address}
      css={{
        marginTop: '$5',
        backgroundColor: selected ? 'rgba(23, 200, 100, 0.2)' : '$accents2'
      }}
      data-testid={`account-select-card-${isRequired ? 'req' : 'opt'}-${index + 1}`}
    >
      <Row justify="space-between" align="center">        
        <Checkbox size="lg" color="success" checked={selected}/>                  

        <Text data-testid={`account-select-text-${index + 1}`}>
          {`${truncate(address, 14)} - Account ${index + 1}`}
        </Text>
      </Row>
    </Card>
  )
}
