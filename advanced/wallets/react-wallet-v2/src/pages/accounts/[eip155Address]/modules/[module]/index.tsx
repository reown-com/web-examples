import ModuleActions from '@/components/ModuleActions'
import PageHeader from '@/components/PageHeader'
import { Module, supportedModules } from '@/data/ERC7579ModuleData'
import { Loading, Spacer, Text } from '@nextui-org/react'
import { useRouter } from 'next/router'
import { Fragment, useEffect, useState } from 'react'

export default function ModulePage() {
  const [accountType, setAccountType] = useState('')
  const [accountAddress, setAccountAddress] = useState('')
  const [chainId, setChainId] = useState('')
  const [module, setModule] = useState<Module>()

  const { query } = useRouter()

  useEffect(() => {
    if (query?.eip155Address) {
      const type = (query.eip155Address as string).split(':')[0]
      const chain = (query.eip155Address as string).split(':')[1]
      const address = (query.eip155Address as string).split(':')[2]
      setAccountType(type)
      setChainId(chain)
      setAccountAddress(address)
    }
    if (query?.module) {
      const erc7579module = supportedModules.find(m => m.url === `/${query.module as string}`)
      setModule(erc7579module)
    }
  }, [query])

  if (!module || !accountAddress || !accountType || !chainId) {
    return <Loading />
  }

  return (
    <Fragment>
      <PageHeader title={`${module.name}`} />
      <Text>{module.description}</Text>
      <Spacer y={1} />
      <ModuleActions accountAddress={accountAddress} chainId={chainId} view={module?.view} />
    </Fragment>
  )
}
