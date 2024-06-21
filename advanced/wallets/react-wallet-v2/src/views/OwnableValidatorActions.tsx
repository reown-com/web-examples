import { Button, Container, Loading, Row, Text, Textarea } from '@nextui-org/react'
import { Fragment, useCallback, useEffect, useState } from 'react'
import OwnableValidatorInstallAction from './OwnableValidatorInstallAction'
import OwnableValidatorUninstallActions from './OwnableValidatorUninstallAction'
import OwnableValidatorSetThresholdAction from './OwnableValidatorSetThresholdAction'
import OwnableValidatorAddOwnerAction from './OwnableValidatorAddOwnerAction'
import {
  getERC7579OwnableValidatorOwners,
  isERC7579ModuleInstalled
} from '@/utils/ERC7579AccountUtils'
import { Address } from 'viem'
import { RefreshOutlined } from '@material-ui/icons'
const { OWNABLE_VALIDATOR_ADDRESS } =
  require('@rhinestone/module-sdk') as typeof import('@rhinestone/module-sdk')
export default function OwnableValidatorActions({
  accountAddress,
  chainId
}: {
  accountAddress: string
  chainId: string
}) {
  const [owners, setOwners] = useState<string[]>([])
  const [threshold, setThreshold] = useState(0)
  const [isInstalled, setInstalled] = useState(false)
  const [isRefeshing, setRefreshing] = useState(false)
  const moduleType = 'validator'
  const moduleAddress = OWNABLE_VALIDATOR_ADDRESS

  const getModuleState = useCallback(async () => {
    const ownersPromise = getERC7579OwnableValidatorOwners({ accountAddress, chainId })
    const installationStatusPromise = isERC7579ModuleInstalled(
      accountAddress as Address,
      chainId,
      moduleType,
      moduleAddress
    )
    try {
      const [owners, isInstalledResult] = await Promise.all([
        ownersPromise,
        installationStatusPromise
      ])
      setOwners(owners)
      setInstalled(isInstalledResult)
    } catch (error) {
      console.error('Error fetching module state:', error)
    }
  }, [accountAddress, chainId, moduleAddress])

  const onRefresh = async () => {
    setRefreshing(true)
    await getModuleState()
    setRefreshing(false)
  }

  useEffect(() => {
    getModuleState()
  }, [accountAddress, chainId, getModuleState, moduleAddress])

  return (
    <Fragment>
      <Row justify="space-between" align="center" css={{ marginBottom: '$5' }}>
        <Text h3>Module Details</Text>
        <Button size={'sm'} auto icon={!isRefeshing && <RefreshOutlined />} onClick={onRefresh}>
          {isRefeshing && <Loading type="spinner" color="currentColor" />}
        </Button>
      </Row>
      <Row justify="space-between" align="center" css={{ marginBottom: '$5' }}>
        <Text h4>Status</Text>
        {isInstalled ? (
          <Text color="success">Installed</Text>
        ) : (
          <Text color="error">Not Installed</Text>
        )}
      </Row>
      {isInstalled && (
        <Fragment>
          <Text h4 css={{ marginBottom: '$5' }}>
            State
          </Text>
          <Container css={{ marginBottom: '$5' }}>
            <Row justify="space-between" align="center" css={{ marginBottom: '$3' }}>
              <Text>Current Threshold</Text>
              <Text>{threshold}</Text>
            </Row>
            <Row justify="space-between" align="center" css={{ marginBottom: '$5' }}>
              <Text>{`Current Owner's Count`}</Text>
              <Text>{owners.length}</Text>
            </Row>
            <Textarea
              label={`Owners Addresses`}
              width="100%"
              readOnly
              bordered
              minRows={3}
              maxRows={3}
              value={owners.join(',')}
            />
          </Container>
        </Fragment>
      )}

      <Text h4 css={{ marginBottom: '$5' }}>
        Available Actions
      </Text>
      <Container gap={1}>
        {!isInstalled ? (
          <OwnableValidatorInstallAction accountAddress={accountAddress} chainId={chainId} />
        ) : (
          <Fragment>
            <OwnableValidatorUninstallActions accountAddress={accountAddress} chainId={chainId} />
            <OwnableValidatorSetThresholdAction
              accountAddress={accountAddress}
              chainId={chainId}
              moduleState={{ owners, threshold }}
            />
            <OwnableValidatorAddOwnerAction
              accountAddress={accountAddress}
              chainId={chainId}
              moduleState={{ owners, threshold }}
            />
          </Fragment>
        )}
      </Container>
    </Fragment>
  )
}
