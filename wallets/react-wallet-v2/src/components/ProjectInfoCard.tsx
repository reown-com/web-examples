import { getVerifyStatus } from '@/utils/HelperUtil'
import { Avatar, Col, Link, Row, Text } from '@nextui-org/react'
import { SignClientTypes, Verify } from '@walletconnect/types'
import { useMemo } from 'react'

/**
 * Types
 */
interface IProps {
  metadata: SignClientTypes.Metadata
  context?: Verify.Context
}

/**
 * Components
 */
export default function ProjectInfoCard({ metadata, context }: IProps) {
  const { icons, name, url } = metadata
  const validation = useMemo(() => getVerifyStatus(context), [context])
  return (
    <>
      <Row align="center">
        <Col span={3}>
          <Avatar src={icons[0]} />
        </Col>
        <Col span={15}>
          <Text h5>{name}</Text>
          <Row>
            <Link href={url}>{url}</Link>
            <Text style={{ marginLeft: '5px' }}>{validation}</Text>
          </Row>
        </Col>
      </Row>
    </>
  )
}
