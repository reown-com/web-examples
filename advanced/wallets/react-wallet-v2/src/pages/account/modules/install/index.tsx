// components/ModuleForm.jsx
import InstallModuleForm from '@/views/InstallModuleForm'
import PageHeader from '@/components/PageHeader'
import { useRouter } from 'next/router'
import React, { Fragment, useState, useEffect } from 'react'
import SettingsStore from '@/store/SettingsStore'
import { useSnapshot } from 'valtio'
import { Chain } from 'viem'
import {
  biconomyAllowedChains,
  kernelAllowedChains,
  safeAllowedChains
} from '@/utils/SmartAccountUtil'

const InstallModulePage = () => {
  const [accountType, setAccountType] = useState('')
  const [accountAddress, setAccountAddress] = useState('')
  const [allowedChains, setAllowedChains] = useState<Chain[]>([])
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
  return (
    <Fragment>
      <PageHeader title="Install Module" />
      <InstallModuleForm accountAddress={accountAddress} allowedChains={allowedChains} />
    </Fragment>
  )
}

export default InstallModulePage
