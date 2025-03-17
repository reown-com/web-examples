import PageHeader from '@/components/PageHeader'
import { getChainData, getViemChain } from '@/data/chainsUtil'
import SettingsStore from '@/store/SettingsStore'
import { truncate } from '@/utils/HelperUtil'
import ModulesManagement from '@/views/ModulesManagement'
import { Card, Divider, Row, Text } from '@nextui-org/react'
import { useRouter } from 'next/router'
import { isSmartAccountDeployed } from 'permissionless'
import { Fragment, useCallback, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'
import { Address, Chain, createPublicClient, http } from 'viem'

export default function AccountPage() {
  const [chainId, setChainId] = useState('')
  const [accountType, setAccountType] = useState('')
  const [accountAddress, setAccountAddress] = useState('')
  const [isAccountDeployed, setIsAccountDeployed] = useState(false)
  const [isFetching, setFetching] = useState(false)
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
    if (query?.eip155Address) {
      const type = (query.eip155Address as string).split(':')[0]
      const chainId = (query.eip155Address as string).split(':')[1]
      const address = (query.eip155Address as string).split(':')[2]
      setAccountType(type)
      setChainId(chainId)
      setAccountAddress(address)
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
    if (!chainId || !accountAddress || !accountType) return
    setFetching(true)
    const chain = getViemChain(parseInt(chainId))
    setSelectedChain(chain)
    chain &&
      isSmartContractAccountDeployed(accountAddress as Address, chain)
        .then(result => {
          setIsAccountDeployed(result)
        })
        .finally(() => setFetching(false))
  }, [
    chainId,
    accountType,
    accountAddress,
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
              {!isFetching && (
                <ModulesManagement
                  accountAddress={accountAddress}
                  accountType={accountType}
                  chainId={chainId}
                  isDeployed={isAccountDeployed}
                />
              )}
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
