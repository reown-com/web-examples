import { Container, Text } from '@nextui-org/react'
import { Fragment } from 'react'
import OwnableValidatorInstallAction from './OwnableValidatorInstallAction'
import OwnableValidatorUninstallActions from './OwnableValidatorUninstallAction'
import OwnableValidatorSetThresholdAction from './OwnableValidatorSetThresholdAction'
import OwnableValidatorAddOwnerAction from './OwnableValidatorAddOwnerAction'

export default function OwnableValidatorActions({
  accountAddress,
  chainId
}: {
  accountAddress: string
  chainId: string
}) {
  return (
    <Fragment>
      <Text h4>Actions</Text>
      <Container gap={1}>
        <OwnableValidatorInstallAction accountAddress={accountAddress} chainId={chainId} />
        <OwnableValidatorUninstallActions accountAddress={accountAddress} chainId={chainId} />
        <OwnableValidatorSetThresholdAction accountAddress={accountAddress} chainId={chainId} />
        <OwnableValidatorAddOwnerAction accountAddress={accountAddress} chainId={chainId} />
      </Container>
    </Fragment>
  )
}
