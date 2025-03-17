import { Module, supportedModules } from '@/data/ERC7579ModuleData'
import { isERC7579ModuleInstalled } from '@/utils/ERC7579AccountUtils'
import { Loading, Row, Text, Card, Container } from '@nextui-org/react'
import { Fragment, useCallback, useEffect, useState } from 'react'
import { Address } from 'viem'
import { useRouter } from 'next/router'
import { styledToast } from '@/utils/HelperUtil'

interface ModulesManagementProps {
  accountType: string
  accountAddress: string
  isDeployed: boolean
  chainId: string
}
// Define the type for the state which combines Module and the isInstalled attribute
type ModuleWithStatus = Module & { isInstalled: boolean }

export default function ModulesManagement({
  accountAddress,
  accountType,
  chainId,
  isDeployed
}: ModulesManagementProps) {
  const [modulesWithStatus, setModulesWithStatus] = useState<ModuleWithStatus[]>(
    supportedModules.map(module => ({ ...module, isInstalled: false }))
  )
  const { query, push } = useRouter()
  const [modulesStatusLoading, setModuleStatusLoading] = useState(true)

  const checkModulesStatus = useCallback(async () => {
    if (!chainId) {
      styledToast('Invalid chainId', 'error')
      setModuleStatusLoading(false)
      return
    }
    if (!isDeployed) {
      setModuleStatusLoading(false)
      return
    }
    setModuleStatusLoading(true)
    const moduleStatusPromises = supportedModules.map(async module => {
      const moduleType = module.type
      const moduleAddress = module.moduleAddress as Address
      const isInstalled = await isERC7579ModuleInstalled(
        accountAddress as Address,
        chainId,
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
  }, [accountAddress, chainId, isDeployed])

  useEffect(() => {
    if (accountType !== 'Biconomy') {
      checkModulesStatus()
    }
  }, [accountType, checkModulesStatus])

  return (
    <Fragment>
      <Text h4 css={{ marginBottom: '$5' }}>
        Module Management
      </Text>
      {modulesStatusLoading && isDeployed ? (
        <Loading />
      ) : (
        <Container gap={0} fluid>
          {modulesWithStatus.map(module => (
            <Card
              key={module.moduleAddress}
              hoverable
              clickable
              bordered
              css={{ marginBottom: '$5' }}
              onClick={() =>
                push({
                  pathname: `/accounts/${query.eip155Address}/modules${module.url}`
                })
              }
            >
              <Row align={'center'} justify="space-between">
                <Text>{module.name}</Text>
                <Text h6 color={module.isInstalled ? 'success' : 'error'}>
                  {module.isInstalled ? 'Installed' : 'Not Installed'}
                </Text>
              </Row>
            </Card>
          ))}
        </Container>
      )}
    </Fragment>
  )
}
