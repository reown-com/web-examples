import { Col, Divider, Row, Text } from '@nextui-org/react'
import { Fragment, ReactNode } from 'react'

/**
 * Types
 */
interface Props {
  children?: ReactNode | ReactNode[]
  title: string
}

/**
 * Component
 */
export default function PageHeader({ title, children }: Props) {
  return (
    <Fragment>
      <Row css={{ marginBottom: '$5', width: '100%' }} justify="space-between" align="center">
        <Col>
          <Text
            h3
            weight="bold"
            css={{
              textGradient: '90deg, $secondary, $primary 30%'
            }}
          >
            {title}
          </Text>
        </Col>
        {children ? <Col css={{ flex: 1 }}>{children}</Col> : null}
      </Row>

      <Divider css={{ marginBottom: '$10' }} />
    </Fragment>
  )
}
