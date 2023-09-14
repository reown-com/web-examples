import { Button, Col, Divider, Row, Text } from '@nextui-org/react'
import { Fragment, ReactNode } from 'react'
import { FiChevronLeft } from 'react-icons/fi'
import NextLink from 'next/link'

/**
 * Types
 */
interface Props {
  children?: ReactNode | ReactNode[]
  title: string
  withBackButton?: boolean
  backButtonHref?: string
  ctaButton?: ReactNode | ReactNode[]
}

/**
 * Component
 */
export default function PageHeader({
  title,
  children,
  ctaButton,
  withBackButton = false,
  backButtonHref = '#'
}: Props) {
  return (
    <Fragment>
      <Row css={{ marginBottom: '$5', width: '100%' }} justify="space-between" align="center">
        {withBackButton && (
          <Col css={{ width: 'auto' }}>
            <NextLink href={backButtonHref} passHref>
              <Button
                size="xl"
                auto
                light
                animated={false}
                icon={<FiChevronLeft />}
                css={{ paddingLeft: 0 }}
              />
            </NextLink>
          </Col>
        )}
        <Col>
          <Text h3 weight="bold">
            {title}
          </Text>
        </Col>
        {children ? <Col css={{ flex: 1 }}>{children}</Col> : null}
        {ctaButton}
      </Row>

      <Divider css={{ marginBottom: '$10' }} />
    </Fragment>
  )
}
