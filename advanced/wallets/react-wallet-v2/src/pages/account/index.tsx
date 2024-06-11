import PageHeader from '@/components/PageHeader'
import SettingsStore from '@/store/SettingsStore'
import { truncate } from '@/utils/HelperUtil'
import {
  biconomyAllowedChains,
  kernelAllowedChains,
  safeAllowedChains
} from '@/utils/SmartAccountUtil'
import { Button, Card, Divider, Row, Text } from '@nextui-org/react'
import { useRouter } from 'next/router'
import { Fragment, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'
import { Chain } from 'viem'

export default function AccountPage() {
  const [accountType, setAccountType] = useState('')
  const [accountAddress, setAccountAddress] = useState('')
  const [isAccountDeployed, setIsAccountDeployed] = useState(false)
  const [allowedChains, setAllowedChains] = useState<Chain[]>([])
  const [selectedChain, setSelectedChain] = useState<string>()
  const {
    smartAccountEnabled,
    kernelSmartAccountAddress,
    kernelSmartAccountEnabled,
    safeSmartAccountAddress,
    safeSmartAccountEnabled,
    biconomySmartAccountAddress,
    biconomySmartAccountEnabled
  } = useSnapshot(SettingsStore.state)
  const { query, replace } = useRouter()

  useEffect(() => {
    if (query?.accountType) {
      setAccountType(query.accountType as string)
    }
  }, [query])

  useEffect(() => {
    if (accountType === 'Kernel') {
      setAccountAddress(kernelSmartAccountAddress)
      setAllowedChains(kernelAllowedChains)
    } else if (accountType === 'Safe') {
      setAccountAddress(safeSmartAccountAddress)
      setAllowedChains(safeAllowedChains)
    } else if (accountType === 'Biconomy') {
      setAccountAddress(biconomySmartAccountAddress)
      setAllowedChains(biconomyAllowedChains)
    }
  }, [accountType, biconomySmartAccountAddress, kernelSmartAccountAddress, safeSmartAccountAddress])

  if (!smartAccountEnabled) {
    return (
      <Fragment>
        <PageHeader title="Module Management" />
        <Text css={{ opacity: '0.5', textAlign: 'center', marginTop: '$20' }}>
          Enable smart accounts
        </Text>
      </Fragment>
    )
  }

  if (!(accountType === 'Kernel' || accountType === 'Safe' || accountType === 'Biconomy')) {
    return (
      <Fragment>
        <PageHeader title="Module Management" />
        <Text css={{ opacity: '0.5', textAlign: 'center', marginTop: '$20' }}>
          Unknown smart account
        </Text>
      </Fragment>
    )
  }

  if (
    (accountType === 'Kernel' && !kernelSmartAccountEnabled) ||
    (accountType === 'Safe' && !safeSmartAccountEnabled) ||
    (accountType === 'Biconomy' && !biconomySmartAccountEnabled)
  ) {
    return (
      <Fragment>
        <PageHeader title="Module Management" />
        <Text css={{ opacity: '0.5', textAlign: 'center', marginTop: '$20' }}>
          Please enable {accountType} smart account
        </Text>
      </Fragment>
    )
  }

  return (
    <Fragment>
      <PageHeader title="Account Details" />
      <Card>
        <Card.Body
          css={{
            paddingTop: '$0',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <Row justify="space-between" align="center" css={{ marginBottom: '$3' }}>
            <Text h4>Type</Text>
            {accountType.toLocaleUpperCase()} SCA
          </Row>
          <Row justify="space-between" align="center" css={{ marginBottom: '$3' }}>
            <Text h4>Address</Text>
            {accountAddress ? truncate(accountAddress, 19) : '<no address available>'}
          </Row>
          <Row justify="space-between" align="center" css={{ marginBottom: '$3' }}>
            <Text h4>Deployed</Text>
            {isAccountDeployed ? 'true' : 'false'}
          </Row>
          <Row justify="space-between" align="center" css={{ marginBottom: '$3' }}>
            <Text h4>Chain</Text>
            <select
              value={selectedChain || ''}
              onChange={e => setSelectedChain(e.currentTarget.value)}
              aria-label="relayerRegions"
              data-testid="smart-account-allowed-chains-select"
            >
              {allowedChains.map((chain, index) => {
                return (
                  <option key={index} value={chain.id}>
                    {chain.name}
                  </option>
                )
              })}
            </select>
          </Row>
          <Row justify="space-between" align="center" css={{ marginBottom: '$3' }}>
            <Text h4>Installed Modules</Text>
            {0}
          </Row>
          <Divider css={{ marginBottom: '$10' }} />
          <Text h4 css={{ marginBottom: '$5' }}>
            Actions
          </Text>
          <Button
            css={{ marginBottom: '$5' }}
            onClick={() => replace({ pathname: '/account/modules', query })}
          >
            View Installed Module
          </Button>
          <Button
            css={{ marginBottom: '$5' }}
            onClick={() => replace({ pathname: '/account/modules/install', query })}
          >
            Install New Module
          </Button>
        </Card.Body>
      </Card>
    </Fragment>
  )
}
