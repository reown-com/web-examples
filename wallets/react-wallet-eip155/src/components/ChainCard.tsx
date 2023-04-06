import { Card } from '@nextui-org/react'
import { ReactNode } from 'react'

interface Props {
  children: ReactNode | ReactNode[]
  rgb: string
  flexDirection: 'row' | 'col'
  alignItems: 'center' | 'flex-start'
}

export default function ChainCard({ rgb, children, flexDirection, alignItems }: Props) {
  return (
    <Card
      css={{
        borderColor: `rgba(${rgb}, 0.4)`,
        boxShadow: `0 0 10px 0 rgba(${rgb}, 0.15)`,
        backgroundColor: `rgba(${rgb}, 0.25)`,
        marginBottom: '$6'
      }}
      variant="bordered"
    >
      <Card.Body
        css={{
          flexDirection,
          alignItems,
          justifyContent: 'space-between',
          overflow: 'hidden',
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 20,
          paddingRight: 20
        }}
      >
        {children}
      </Card.Body>
    </Card>
  )
}
