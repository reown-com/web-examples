import { supportedModules } from '@/data/ERC7579ModuleData'
import { isERC7579ModuleInstalled, installERC7579Module } from '@/utils/ERC7579AccountUtils'
import { styledToast } from '@/utils/HelperUtil'
import { Button, Card, Loading, Row, Text } from '@nextui-org/react'
import { Fragment, useCallback, useEffect, useState } from 'react'
import { Address, Chain } from 'viem'

type ModulesWithStatus = {
  isInstalled: boolean
  name: string
  type: number
  description: string
  moduleAddress: string
  moduleData: string
}
interface ModulesManagementProps {
  accountType: string
  accountAddress: string
  isDeployed: boolean
  chain: Chain
}

export default function ModulesManagement({
  accountAddress,
  accountType,
  chain,
  isDeployed
}: ModulesManagementProps) {
  const [modulesWithStatus, setModulesWithStatus] = useState<ModulesWithStatus[]>(
    supportedModules.map(module => ({ ...module, isInstalled: false }))
  )
  const [isLoading, setLoading] = useState(false)
  const [modulesStatusLoading, setModuleStatusLoading] = useState(true)

  const checkModulesStatus = useCallback(async () => {
    if (!chain || !isDeployed) return

    setModuleStatusLoading(true)
    const moduleStatusPromises = supportedModules.map(async module => {
      const moduleType = BigInt(module.type)
      const moduleAddress = module.moduleAddress as Address
      const isInstalled = await isERC7579ModuleInstalled(
        accountAddress as Address,
        chain,
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
  }, [accountAddress, chain, isDeployed])

  useEffect(() => {
    if (isDeployed && accountType !== 'Biconomy') {
      checkModulesStatus()
    }
  }, [accountType, checkModulesStatus, isDeployed])

  const onInstall = async (
    accountAddress: string,
    chainId: string,
    moduleType: string,
    moduleAddress: string
  ) => {
    setLoading(true)
    try {
      const txHash = await installERC7579Module({
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

  return (
    <Fragment>
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
                    disabled={module.name !== 'Permission Validator' || accountType !== 'Safe'}
                    onClick={() =>
                      onInstall(
                        accountAddress,
                        chain?.id.toString(),
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
    </Fragment>
  )
}
