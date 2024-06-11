import PageHeader from '@/components/PageHeader'
import SettingsStore from '@/store/SettingsStore'
import { truncate } from '@/utils/HelperUtil'
import {
  biconomyAllowedChains,
  kernelAllowedChains,
  safeAllowedChains
} from '@/utils/SmartAccountUtil'
import { ModuleInstalledEventAbi } from '@/utils/safe7579AccountUtils/abis/Account'
import { Button, Card, Divider, Row, Text } from '@nextui-org/react'
import { useRouter } from 'next/router'
import { isSmartAccountDeployed } from 'permissionless'
import { Fragment, useCallback, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'
import { Address, Chain, createPublicClient, http } from 'viem'
import * as viemChains from 'viem/chains'

export default function ModulesPage() {
  const [accountType, setAccountType] = useState('')
  const [accountAddress, setAccountAddress] = useState('')
  const [isAccountDeployed, setIsAccountDeployed] = useState(false)
  const [selectedChain, setSelectedChain] = useState<string>()
  const [installedModules, setInstalledModules] = useState<
    { moduleTypeId: bigint | undefined; module: `0x${string}` | undefined }[]
  >([])

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

  function getChain(id: number) {
    const chains = Object.values(viemChains) as viemChains.Chain[]

    return chains.find(x => x.id === id)
  }

  const fetchInstalledModules = useCallback(async (accountAddress: Address, chainId: string) => {
    console.log({ accountAddress })
    console.log({ chainId })
    const publicClient = createPublicClient({
      transport: http(),
      chain: getChain(parseInt(chainId))
    })

    const accountDeployed = await isSmartAccountDeployed(publicClient, accountAddress)
    if (!accountDeployed) {
      return []
    }

    const logs = await publicClient.getContractEvents({
      address: accountAddress,
      abi: ModuleInstalledEventAbi,
      eventName: 'ModuleInstalled',
      fromBlock: 5843820n,
      toBlock: 5843830n
    })

    console.log({ logs })
    const installedModules = logs.map(log => {
      return {
        moduleTypeId: log.args.moduleTypeId,
        module: log.args.module
      }
    })
    setInstalledModules(installedModules)
  }, [])

  useEffect(() => {
    if (query?.accountType) {
      setAccountType(query.accountType as string)
    }
  }, [query])

  useEffect(() => {
    if (accountType === 'Kernel') {
      setAccountAddress(kernelSmartAccountAddress)
      fetchInstalledModules(kernelSmartAccountAddress as Address, viemChains.sepolia.id.toString())
    } else if (accountType === 'Safe') {
      setAccountAddress(safeSmartAccountAddress)
      fetchInstalledModules(safeSmartAccountAddress as Address, viemChains.sepolia.id.toString())
    } else if (accountType === 'Biconomy') {
      setAccountAddress(biconomySmartAccountAddress)
      fetchInstalledModules(
        biconomySmartAccountAddress as Address,
        viemChains.sepolia.id.toString()
      )
    }
  }, [
    accountType,
    biconomySmartAccountAddress,
    fetchInstalledModules,
    kernelSmartAccountAddress,
    safeSmartAccountAddress
  ])

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

  if (installedModules.length === 0)
    return (
      <Fragment>
        <PageHeader title="Module Management" />
        <Card>
          <Card.Body
            css={{
              paddingTop: '$0',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <Text h4 css={{ marginBottom: '$5' }}>
              No modules on {accountType} smart account
            </Text>
          </Card.Body>
        </Card>
        {/* <Text css={{ opacity: '0.5', textAlign: 'center', marginTop: '$20' }}>
       No modules on {accountType} smart account
      </Text> */}
      </Fragment>
    )

  return (
    <Fragment>
      <PageHeader title="Module Management" />

      {installedModules.map((moduleData, index) => (
        <Row key={index}>
          <Text size={12}>{moduleData.moduleTypeId?.toString()}</Text>
          <Text weight="light" size={12}>
            {moduleData.module}
          </Text>
        </Row>
      ))}
      <Button onClick={() => replace({ pathname: '/account', query })}>Back</Button>
    </Fragment>
  )
}
