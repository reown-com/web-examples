import { Fragment, useMemo } from 'react'
import OwnableValidatorActions from '@/views/OwnableValidatorActions'
import { ModuleView } from '@/data/ERC7579ModuleData'
import { Module } from '@rhinestone/module-sdk'

export default function ModuleActions({
  accountAddress,
  chainId,
  view
}: {
  accountAddress: string
  chainId: string
  view?: ModuleView
}) {
  const componentView = useMemo(() => {
    switch (view) {
      case 'OwnableValidatorActions':
        return <OwnableValidatorActions accountAddress={accountAddress} chainId={chainId} />
      default:
        return null
    }
  }, [accountAddress, chainId, view])

  return <Fragment>{componentView}</Fragment>
}
