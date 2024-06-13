import PageHeader from '@/components/PageHeader'
import SettingsStore from '@/store/SettingsStore'
import { truncate } from '@/utils/HelperUtil'
import {
  biconomyAllowedChains,
  kernelAllowedChains,
  safeAllowedChains
} from '@/utils/SmartAccountUtil'
import ModulesManagement from '@/views/ModulesManagement'
import { Card, Divider, Row, Text } from '@nextui-org/react'
import { useRouter } from 'next/router'
import { isSmartAccountDeployed } from 'permissionless'
import { Fragment, useCallback, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'
import { Address, Chain, createPublicClient, http } from 'viem'

export default function AccountPage() {
  const [accountType, setAccountType] = useState('')
  const [chainId, setChainId] = useState('')
  const [accountAddress, setAccountAddress] = useState('')
  const [isAccountDeployed, setIsAccountDeployed] = useState(false)
  const [selectedChain, setSelectedChain] = useState<Chain>()
  const {
    smartAccountEnabled,
    kernelSmartAccountAddress,
    kernelSmartAccountEnabled,
    safeSmartAccountAddress,
    safeSmartAccountEnabled,
    biconomySmartAccountAddress,
    biconomySmartAccountEnabled,
    moduleManagementEnabled
  } = useSnapshot(SettingsStore.state)
  const { query } = useRouter()

  useEffect(() => {
    if (query?.accountType) {
      setAccountType(query.accountType as string)
    }
    if (query?.chainId) {
      setChainId(query.chainId as string)
    }
  }, [query])

  const isSmartContractAccountDeployed = useCallback(
    async (accountAddress: Address, chain: Chain) => {
      const publicClient = createPublicClient({
        transport: http(),
        chain: chain
      })

      return await isSmartAccountDeployed(publicClient, accountAddress)
    },
    []
  )
  useEffect(() => {
    if (!chainId || !accountType) return

    let address, chain
    if (accountType === 'Kernel') {
      address = kernelSmartAccountAddress as Address
      chain = kernelAllowedChains.find(c => c.id === parseInt(chainId))
    } else if (accountType === 'Safe') {
      address = safeSmartAccountAddress as Address
      chain = safeAllowedChains.find(c => c.id === parseInt(chainId))
    } else if (accountType === 'Biconomy') {
      address = biconomySmartAccountAddress as Address
      chain = biconomyAllowedChains.find(c => c.id === parseInt(chainId))
    }

    if (address && chain) {
      setAccountAddress(address)
      setSelectedChain(chain)

      isSmartContractAccountDeployed(address, chain).then(result => {
        setIsAccountDeployed(result)
      })
    }
  }, [
    accountType,
    chainId,
    isSmartContractAccountDeployed,
    kernelSmartAccountAddress,
    safeSmartAccountAddress,
    biconomySmartAccountAddress
  ])

  if (!smartAccountEnabled) {
    return (
      <Fragment>
        <PageHeader title="Account Details" />
        <Text css={{ opacity: '0.5', textAlign: 'center', marginTop: '$20' }}>
          Please Enable smart accounts
        </Text>
      </Fragment>
    )
  }

  if (
    !(accountType === 'Kernel' || accountType === 'Safe' || accountType === 'Biconomy') ||
    !selectedChain
  ) {
    return (
      <Fragment>
        <PageHeader title="Account Details" />
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
        <PageHeader title="Account Details" />
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
            <Text>{selectedChain?.name}</Text>
          </Row>

          {moduleManagementEnabled ? (
            <Fragment>
              <Divider css={{ marginBottom: '$10' }} />
              <ModulesManagement
                accountAddress={accountAddress}
                accountType={accountType}
                chain={selectedChain}
                isDeployed={isAccountDeployed}
              />
            </Fragment>
          ) : (
            <Row justify="space-between" align="center">
              <Text h4>Module Management</Text>
              <Text>Disabled</Text>
            </Row>
          )}
        </Card.Body>
      </Card>
    </Fragment>
  )
}
