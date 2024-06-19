import { installERC7579Module, manageERC7579Module } from '@/utils/ERC7579AccountUtils'
import { styledToast } from '@/utils/HelperUtil'
import {
  Button,
  Col,
  Collapse,
  Container,
  Input,
  Loading,
  Row,
  Text,
  Textarea
} from '@nextui-org/react'
import { Fragment, useState } from 'react'
import { getAddress } from 'viem'
const {
  getSetOwnableValidatorThresholdAction,
  getInstallOwnableValidator,
  getAddOwnableValidatorOwnerAction
} = require('@rhinestone/module-sdk') as typeof import('@rhinestone/module-sdk')

export default function OwnableValidatorActions({
  accountAddress,
  chainId
}: {
  accountAddress: string
  chainId: string
}) {
  const [threshold, setThreshold] = useState(0)
  const [addresses, setAddresses] = useState('')
  const [isLoading, setLoading] = useState(false)
  const ownerCount = addresses ? addresses.split(',').length : 0

  const onInstall = async () => {
    setLoading(true)
    try {
      const installOwnableValidator = getInstallOwnableValidator({
        threshold: threshold,
        owners: addresses.split(',').map(address => getAddress(address))
      })
      const txReceipt = await installERC7579Module({
        accountAddress,
        chainId: chainId,
        module: installOwnableValidator
      })
      if (!txReceipt?.success) {
        styledToast(`Some error occurred`, 'error')
      }

      styledToast(`Module Installed Successfully`, 'success')
    } catch (e) {
      console.error(e)
      styledToast((e as Error).message, 'error')
    }
    setLoading(false)
  }

  const uninstall = async () => {
    setLoading(true)
    setLoading(false)
  }

  const updateThreshold = async () => {
    setLoading(true)
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
    setLoading(false)
  }

  const addOwner = async () => {
    setLoading(true)
    try {
      const address = addresses.split(',')
      const addOwnableValidatorOwnerAction = getAddOwnableValidatorOwnerAction({
        owner: address[0] as `0x${string}`
      })
      const txReceipt = await manageERC7579Module({
        accountAddress,
        chainId: chainId,
        executions: [addOwnableValidatorOwnerAction]
      })
      if (!txReceipt?.success) {
        styledToast(`Some error occurred`, 'error')
      }

      styledToast(`Added owner Successfully`, 'success')
    } catch (e) {
      console.error(e)
      styledToast((e as Error).message, 'error')
    }
    setLoading(false)
  }

  return (
    <Fragment>
      <Text h4>Actions</Text>
      <Container gap={1}>
        <Collapse css={{ marginBottom: '$2' }} bordered title={<Text h5>Install</Text>}>
          <Col css={{ padding: '$5', paddingTop: 0 }}>
            <Row justify="space-between" align="center" css={{ marginBottom: '$5' }}>
              <Text small css={{ paddingLeft: '$2' }}>{`Owner's Count `}</Text>
              <Text>{ownerCount}</Text>
            </Row>
            <Row fluid justify="space-between" align="center" css={{ marginBottom: '$5' }}>
              <Input
                css={{ width: '100%' }}
                bordered
                value={threshold}
                label="Threshold"
                type="number"
                onChange={e => setThreshold(parseInt(e.target.value))}
                placeholder="threshold"
              />
            </Row>
            <Row justify="space-between" align="flex-start" css={{ marginBottom: '$5' }}>
              <Textarea
                css={{ width: '100%' }}
                bordered
                value={addresses}
                label="Addresses"
                onChange={e => setAddresses(e.target.value)}
                placeholder="Enter comma separated addresses."
              />
            </Row>
            <Row justify="flex-end">
              <Button auto onClick={onInstall}>
                {isLoading ? <Loading type="points" color="currentColor" size="sm" /> : 'Install'}
              </Button>
            </Row>
          </Col>
        </Collapse>
        <Collapse css={{ marginBottom: '$2' }} bordered title={<Text h5>Uninstall</Text>}>
          <Row justify="space-between" align="center">
            <Text>Uninstall module</Text>
            <Button auto color={'error'} onClick={uninstall}>
              {isLoading ? <Loading type="points" color="currentColor" size="sm" /> : 'Uninstall'}
            </Button>
          </Row>
        </Collapse>
        <Collapse css={{ marginBottom: '$2' }} bordered title={<Text h5>Update threshold</Text>}>
          <Col css={{ padding: '$5', paddingTop: 0 }}>
            <Row fluid justify="space-between" align="center" css={{ marginBottom: '$5' }}>
              <Input
                css={{ width: '100%' }}
                bordered
                value={threshold}
                label="Threshold"
                type="number"
                onChange={e => setThreshold(parseInt(e.target.value))}
                placeholder="threshold"
              />
            </Row>
            <Row justify="flex-end">
              <Button auto onClick={updateThreshold}>
                {isLoading ? (
                  <Loading type="points" color="currentColor" size="sm" />
                ) : (
                  'Update Threshold'
                )}
              </Button>
            </Row>
          </Col>
        </Collapse>
        <Collapse css={{ marginBottom: '$2' }} bordered title={<Text h5>Add Owner</Text>}>
          <Col css={{ padding: '$5', paddingTop: 0 }}>
            <Row fluid justify="space-between" align="center" css={{ marginBottom: '$5' }}>
              <Input
                css={{ width: '100%' }}
                bordered
                value={addresses}
                label="Owner"
                type="text"
                onChange={e => setThreshold(parseInt(e.target.value))}
                placeholder="add owner address"
              />
            </Row>
            <Row justify="flex-end">
              <Button auto onClick={addOwner}>
                {isLoading ? <Loading type="points" color="currentColor" size="sm" /> : 'Add Owner'}
              </Button>
            </Row>
          </Col>
        </Collapse>
      </Container>
    </Fragment>
  )
}
