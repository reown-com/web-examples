import { Avatar, Col, Divider, Link, Row, Text } from '@nextui-org/react'
import { SessionTypes } from '@walletconnect/types'
import { Fragment } from 'react'

/**
 * Types
 */
interface IProps {
  metadata: SessionTypes.Participant['metadata']
}

/**
 * Components
 */
export default function ProjectInfoCard({ metadata }: IProps) {
  const { icons, name, url } = metadata

  return (
    <Fragment>
      <Row align="center">
        <Col span={3}>
          <Avatar src={icons[0]} />
        </Col>
        <Col span={14}>
          <Text h5>{name}</Text>
          <Link href={url}>{url}</Link>
        </Col>
      </Row>

      <Divider y={2} />
    </Fragment>
  )
}
