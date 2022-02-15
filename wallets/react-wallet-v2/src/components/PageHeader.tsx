import { Divider, Text } from '@nextui-org/react'
import { Fragment } from 'react'

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
    <Fragment>
      <Text
        h3
        weight="bold"
        css={{
          textGradient: '90deg, $secondary, $primary 30%',
          marginBottom: '$5'
        }}
      >
        {children}
      </Text>
      <Divider css={{ marginBottom: '$10' }} />
    </Fragment>
  )
}
