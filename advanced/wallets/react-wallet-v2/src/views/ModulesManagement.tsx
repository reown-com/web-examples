import { ModuleView, supportedModules } from '@/data/ERC7579ModuleData'
import { isERC7579ModuleInstalled } from '@/utils/ERC7579AccountUtils'
import { Loading, Row, Text, Card, Container } from '@nextui-org/react'
import { Fragment, useCallback, useEffect, useState } from 'react'
import { Address, Chain } from 'viem'
import { useRouter } from 'next/router'

type ModulesWithStatus = {
  view?: ModuleView
  isInstalled: boolean
  name: string
  type: number
  url: string
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
  const { query, push } = useRouter()
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

  return (
    <Fragment>
      <Text h4 css={{ marginBottom: '$5' }}>
        Module Management
      </Text>
      {modulesStatusLoading ? (
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
