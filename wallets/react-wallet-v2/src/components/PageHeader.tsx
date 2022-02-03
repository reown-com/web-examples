import { Text } from '@nextui-org/react'

interface Props {
  children: string
}

export default function PageHeader({ children }: Props) {
  return (
    <Text
      h3
      css={{
        textGradient: '45deg, $cyan300 -30%, $green600 100%'
      }}
      weight="bold"
    >
      {children}
    </Text>
  )
}
