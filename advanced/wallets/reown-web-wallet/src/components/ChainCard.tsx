import { Card } from '@nextui-org/react'
import { ReactNode } from 'react'

interface Props {
  children: ReactNode | ReactNode[]
  rgb: string
  flexDirection: 'row' | 'col'
  alignItems: 'center' | 'flex-start'
  flexWrap?: 'wrap' | 'nowrap'
}

export default function ChainCard({ rgb, children, flexDirection, alignItems, flexWrap }: Props) {
  return (
    <Card
      bordered
      borderWeight="light"
      css={{
        borderColor: `rgba(${rgb}, 0.4)`,
        boxShadow: `0 0 10px 0 rgba(${rgb}, 0.15)`,
        backgroundColor: `rgba(${rgb}, 0.25)`,
        marginBottom: '$6',
        minHeight: '70px'
      }}
    >
      <Card.Body
        css={{
          flexWrap,
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
