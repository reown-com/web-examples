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
          textGradient: '45deg, $primary, $secondary 100%',
          marginBottom: '$5'
        }}
      >
        {children}
      </Text>
      <Divider css={{ marginBottom: '$10' }} />
    </Fragment>
  )
}
