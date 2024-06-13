import PageHeader from '@/components/PageHeader'
import { supportedModules } from '@/data/ERC7579ModuleData'
import SettingsStore from '@/store/SettingsStore'
import { onInstallModule } from '@/utils/ERC7579AccountUtils'
import { styledToast, truncate } from '@/utils/HelperUtil'
import {
  biconomyAllowedChains,
  kernelAllowedChains,
  safeAllowedChains
} from '@/utils/SmartAccountUtil'
import { isModuleInstalledAbi } from '@/utils/safe7579AccountUtils/abis/Account'
import { Button, Card, Divider, Loading, Row, Text } from '@nextui-org/react'
import { useRouter } from 'next/router'
import { isSmartAccountDeployed } from 'permissionless'
import { Fragment, useCallback, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'
import { Address, Chain, createPublicClient, http } from 'viem'

type ModulesWithStatus = {
  isInstalled: boolean
  name: string
  type: number
  description: string
  moduleAddress: string
  moduleData: string
}

export default function AccountPage() {
  const [accountType, setAccountType] = useState('')
  const [chainId, setChainId] = useState('')
  const [accountAddress, setAccountAddress] = useState('')
  const [isAccountDeployed, setIsAccountDeployed] = useState(false)
  const [modulesWithStatus, setModulesWithStatus] = useState<ModulesWithStatus[]>(
    supportedModules.map(module => ({ ...module, isInstalled: false }))
  )
  const [selectedChain, setSelectedChain] = useState<Chain>()
  const [isLoading, setLoading] = useState(false)
  const [modulesStatusLoading, setModuleStatusLoading] = useState(false)
  const {
    smartAccountEnabled,
    kernelSmartAccountAddress,
    kernelSmartAccountEnabled,
    safeSmartAccountAddress,
    safeSmartAccountEnabled,
    biconomySmartAccountAddress,
    biconomySmartAccountEnabled
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

  const checkModulesStatus = useCallback(async () => {
    if (!selectedChain || !isAccountDeployed) return

    setModuleStatusLoading(true)
    const moduleStatusPromises = supportedModules.map(async module => {
      const moduleType = BigInt(module.type)
      const moduleAddress = module.moduleAddress as Address
      const isInstalled = await isModuleInstalled(
        accountAddress as Address,
        selectedChain,
        moduleType,
        moduleAddress
      )
      return {
        ...module,
        isInstalled
      }
    })

    const modulesWithStatus = await Promise.all(moduleStatusPromises)
    setModulesWithStatus(modulesWithStatus)
    setModuleStatusLoading(false)
  }, [accountAddress, selectedChain, isAccountDeployed])

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
      address = kernelSmartAccountAddress
      chain = kernelAllowedChains.find(c => c.id === parseInt(chainId))
    } else if (accountType === 'Safe') {
      address = safeSmartAccountAddress
      chain = safeAllowedChains.find(c => c.id === parseInt(chainId))
    } else if (accountType === 'Biconomy') {
      address = biconomySmartAccountAddress
      chain = biconomyAllowedChains.find(c => c.id === parseInt(chainId))
    }

    if (address && chain) {
      setAccountAddress(address)
      setSelectedChain(chain)

      isSmartContractAccountDeployed(address as Address, chain).then(result => {
        setIsAccountDeployed(result)
        if (result) {
          checkModulesStatus()
        }
      })
    }
  }, [
    accountType,
    chainId,
    checkModulesStatus,
    isSmartContractAccountDeployed,
    kernelSmartAccountAddress,
    safeSmartAccountAddress,
    biconomySmartAccountAddress
  ])

  const onInstall = async (
    accountAddress: string,
    chainId: string,
    moduleType: string,
    moduleAddress: string
  ) => {
    setLoading(true)
    try {
      const txHash = await onInstallModule({
        accountAddress,
        chainId: chainId,
        moduleType: moduleType,
        moduleAddress: moduleAddress
      })
      styledToast(`Module Installed Successfully`, 'success')
    } catch (e) {
      console.error(e)
      styledToast((e as Error).message, 'error')
    }
    setLoading(false)
  }

  const isModuleInstalled = async (
    accountAddress: Address,
    chain: Chain,
    moduleType: bigint,
    moduleAddress: Address
  ) => {
    const publicClient = createPublicClient({
      transport: http(),
      chain: chain
    })

    return await publicClient.readContract({
      address: accountAddress as Address,
      abi: isModuleInstalledAbi,
      functionName: 'isModuleInstalled',
      args: [
        moduleType, // ModuleType
        moduleAddress, // Module Address
        '0x' // Additional Context
      ]
    })
  }

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

  if (
    !(accountType === 'Kernel' || accountType === 'Safe' || accountType === 'Biconomy') ||
    !selectedChain
  ) {
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
            <Text>{selectedChain?.name}</Text>
          </Row>
          <Divider css={{ marginBottom: '$10' }} />
          <Text h4 css={{ marginBottom: '$5' }}>
            Module Management
          </Text>
          {modulesStatusLoading ? (
            <Loading />
          ) : (
            modulesWithStatus.map(module => (
              <Card bordered key={module.moduleAddress} css={{ marginBottom: '$5' }}>
                <Card.Body>
                  <Row justify="space-between" align="center">
                    <Text>{module.name}</Text>
                    {module.isInstalled ? (
                      <Button auto color={'error'} disabled>
                        Uninstall
                      </Button>
                    ) : (
                      <Button
                        auto
                        disabled={module.name !== 'Permission Validator'}
                        onClick={() =>
                          onInstall(
                            accountAddress,
                            selectedChain?.id.toString(),
                            module.type.toString(),
                            module.moduleAddress
                          )
                        }
                      >
                        Install
                      </Button>
                    )}
                  </Row>
                </Card.Body>
              </Card>
            ))
          )}
        </Card.Body>
      </Card>
    </Fragment>
  )
}
