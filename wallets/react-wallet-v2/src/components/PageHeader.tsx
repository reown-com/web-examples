import { Text } from '@nextui-org/react'

interface Props {
  children: string
}

export default function PageHeader({ children }: Props) {
  return (
    <Text
      h3
      css={{
        textGradient: '45deg, $primary -30%, $secondary 100%'
      }}
      weight="bold"
    >
      {children}
    </Text>
  )
}
