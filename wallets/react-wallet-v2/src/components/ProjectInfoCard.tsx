import { useMemo } from 'react'
import { useSnapshot } from 'valtio'

import SettingsStore from '@/store/SettingsStore'
import { getVerifyStatus } from '@/utils/HelperUtil'
import { Avatar, Col, Link, Row, Text } from '@nextui-org/react'
import { SignClientTypes } from '@walletconnect/types'

/**
 * Types
 */
interface IProps {
  metadata: SignClientTypes.Metadata
}

/**
 * Components
 */
export default function ProjectInfoCard({ metadata }: IProps) {
  const { currentRequestVerifyContext } = useSnapshot(SettingsStore.state)
  const { icons, name, url } = metadata
  const validation = useMemo(
    () => getVerifyStatus(currentRequestVerifyContext),
    [currentRequestVerifyContext]
  )
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
