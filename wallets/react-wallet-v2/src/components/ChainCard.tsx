import { Card } from '@nextui-org/react'
import { MouseEventHandler, ReactNode } from 'react'

interface Props {
  children: ReactNode | ReactNode[]
  rgb: string
  flexDirection: 'row' | 'col'
  alignItems: 'center' | 'flex-start'
  selected: boolean
  onSelect: Function
}

export default function ChainCard({
  rgb,
  children,
  flexDirection,
  alignItems,
  selected,
  onSelect
}: Props) {
  return (
    <Card
      bordered
      borderWeight="light"
      css={{
        borderColor: `rgba(${rgb}, 0.4)`,
        boxShadow: selected ? `0 0 10px rgb(${rgb})` : `0 0 10px 0 rgba(${rgb}, 0.15)`,
        backgroundColor: `rgba(${rgb}, 0.25)`,
        marginBottom: '$6',
        minHeight: '70px',
        cursor: 'pointer'
      }}
      onClick={() => onSelect()}
    >
      <Card.Body
        css={{
          flexDirection,
          alignItems,
          justifyContent: 'space-between',
          overflow: 'hidden'
        }}
      >
        {children}
      </Card.Body>
    </Card>
  )
}
