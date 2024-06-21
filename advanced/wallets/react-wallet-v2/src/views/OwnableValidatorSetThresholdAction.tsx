import { getERC7579OwnableValidatorOwners, manageERC7579Module } from '@/utils/ERC7579AccountUtils'
import { styledToast } from '@/utils/HelperUtil'
import { Button, Col, Collapse, Input, Loading, Row, Text } from '@nextui-org/react'
import { useEffect, useState } from 'react'
const { getSetOwnableValidatorThresholdAction } =
  require('@rhinestone/module-sdk') as typeof import('@rhinestone/module-sdk')

export default function OwnableValidatorSetThresholdAction({
  accountAddress,
  chainId,
  moduleState
}: {
  accountAddress: string
  chainId: string
  moduleState?: { owners: string[]; threshold: number }
}) {
  const [threshold, setThreshold] = useState(0)
  const ownerCount = (moduleState?.owners || []).length
  const [isUpdatingThreshold, setUpdatingThreshold] = useState(false)
  console.log({ moduleState })
  const updateThreshold = async () => {
    setUpdatingThreshold(true)
    try {
      const setOwnableValidatorThresholdAction = getSetOwnableValidatorThresholdAction({
        threshold
      })
      const txReceipt = await manageERC7579Module({
        accountAddress,
        chainId: chainId,
        executions: [setOwnableValidatorThresholdAction]
      })
      if (!txReceipt?.success) {
        styledToast(`Some error occurred`, 'error')
      }

      styledToast(`Updated threshold Successfully`, 'success')
    } catch (e) {
      console.error(e)
      styledToast((e as Error).message, 'error')
    }
    setUpdatingThreshold(false)
  }

  return (
    <Collapse css={{ marginBottom: '$2' }} bordered title={<Text h5>Update threshold</Text>}>
      <Col css={{ padding: '$5', paddingTop: 0 }}>
        <Row justify="space-between" align="center" css={{ marginBottom: '$5' }}>
          <Text small css={{ paddingLeft: '$2' }}>{`Current Owner's Count `}</Text>
          <Text small>{ownerCount}</Text>
        </Row>
        <Row fluid justify="space-between" align="center" css={{ marginBottom: '$5' }}>
          <Input
            css={{ width: '100%' }}
            bordered
            value={threshold || 0}
            label="Threshold"
            type="number"
            onChange={e => setThreshold(parseInt(e.target.value))}
            placeholder="threshold"
          />
        </Row>
        <Row justify="flex-end">
          <Button
            auto
            disabled={ownerCount === 0 || !threshold || threshold > ownerCount}
            onClick={updateThreshold}
          >
            {isUpdatingThreshold ? (
              <Loading type="points" color="currentColor" size="sm" />
            ) : (
              'Update Threshold'
            )}
          </Button>
        </Row>
      </Col>
    </Collapse>
  )
}
