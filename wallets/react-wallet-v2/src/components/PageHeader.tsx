import { Text } from '@nextui-org/react'

/**
 * Types
 */
interface Props {
  children: string
}

/**
 * Component
 */
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
