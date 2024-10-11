import { installERC7579Module } from '@/utils/ERC7579AccountUtils'
import { styledToast } from '@/utils/HelperUtil'
import { Button, Col, Collapse, Input, Loading, Row, Text, Textarea } from '@nextui-org/react'
import { useState } from 'react'
import { getAddress, isAddress } from 'viem'
const { getOwnableValidator } =
  require('@rhinestone/module-sdk') as typeof import('@rhinestone/module-sdk')

export default function OwnableValidatorInstallAction({
  accountAddress,
  chainId
}: {
  accountAddress: string
  chainId: string
}) {
  const [threshold, setThreshold] = useState(0)
  const [addresses, setAddresses] = useState('')
  const [isInstalling, setInstalling] = useState(false)

  const isValidAddressAndThreshold = (threshold: number, addresses: string) => {
    const ownerCount = addresses ? addresses.split(',').length : 0

    if (ownerCount === 0 || threshold === 0 || ownerCount < threshold) {
      return false
    }

    const addressArray = addresses.split(',')

    // Check if all addresses are valid
    const allAddressesValid = addressArray.every(address => {
      return isAddress(address.trim()) // Trim whitespace from each address
    })

    return allAddressesValid
  }

  const onInstall = async () => {
    setInstalling(true)
    try {
      if (!addresses) {
        styledToast(`Please enter owner's addresses`, 'error')
        setInstalling(false)
        return
      }
      const ownerCount = addresses.split(',').length
      if (threshold === 0 || threshold > ownerCount) {
        styledToast(`Please enter valid threshold value`, 'error')
        setInstalling(false)
        return
      }
      const installOwnableValidator = getOwnableValidator({
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
      console.error((e as Error).message)
      styledToast(`Some error occurred`, 'error')
    }
    setInstalling(false)
  }

  return (
    <Collapse css={{ marginBottom: '$2' }} bordered title={<Text h5>Install</Text>}>
      <Col css={{ padding: '$5', paddingTop: 0 }}>
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
        <Row justify="space-between" align="flex-start" css={{ marginBottom: '$5' }}>
          <Textarea
            css={{ width: '100%' }}
            bordered
            maxRows={4}
            minRows={4}
            value={addresses}
            label="Addresses"
            onChange={e => setAddresses(e.target.value)}
            placeholder="Enter comma separated addresses."
          />
        </Row>
        <Row justify="flex-end">
          <Button
            auto
            disabled={!isValidAddressAndThreshold(threshold, addresses)}
            onClick={onInstall}
          >
            {isInstalling ? <Loading type="points" color="currentColor" size="sm" /> : 'Install'}
          </Button>
        </Row>
      </Col>
    </Collapse>
  )
}
