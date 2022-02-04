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
      h2
      weight="bold"
      css={{
        textGradient: '45deg, $primary, $secondary 100%',
        marginBottom: '$10'
      }}
    >
      {children}
    </Text>
  )
}
