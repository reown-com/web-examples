import { Module, moduleTypeIds, supportedModules } from '@/data/ERC7579ModuleData'
import { onInstallModule } from '@/utils/ERC7579AccountUtils'
import { styledToast, truncate } from '@/utils/HelperUtil'
import { Button, Loading, Row, Text, Textarea } from '@nextui-org/react'
import React, { Fragment, useState, useEffect } from 'react'
import { Chain } from 'viem'

interface InstallModuleFormProps {
  accountAddress: string,
  allowedChains:Chain[]
}

const InstallModuleForm = ({ accountAddress, allowedChains }: InstallModuleFormProps) => {
  const [isLoading, setLoading] = useState(false)
  const [moduleType, setModuleType] = useState('')
  const [selectedChain, setSelectedChain] = useState<string>('')
  const [filteredModules, setFilteredModules] = useState<Module[]>([])
  const [module, setModule] = useState('')

  const onInstall = async () => {
    setLoading(true)
    try {
      const txHash = await onInstallModule({
        accountAddress,
        chainId: selectedChain,
        moduleType: moduleType,
        moduleAddress: module
      })
      styledToast(`Module Installed Successfully`, 'success')
    } catch (e) {
      console.error(e)
      styledToast((e as Error).message, 'error')
    }
    setLoading(false)
  }

  useEffect(() => {
    if (moduleType) {
      setFilteredModules(supportedModules.filter(mod => mod.type === parseInt(moduleType)))
    } else {
      setFilteredModules([])
    }
    setModule('') // Reset module selection when moduleType changes
  }, [moduleType])

  return (
    <Fragment>
      <Row justify="space-between" align="center" css={{ marginBottom: '$5' }}>
        <Text h4 css={{ flexGrow: 1 }}>
          Account
        </Text>
        <Text css={{ flexGrow: 1, maxWidth: '50%' }}>
          {accountAddress ? truncate(accountAddress, 19) : '<no address available>'}
        </Text>
      </Row>
      <Row justify="space-between" align="center" css={{ marginBottom: '$5' }}>
        <Text h4 css={{ flexGrow: 1 }}>
          Chain
        </Text>
        <div style={{ flexGrow: 1, maxWidth: '50%' }}>
          <select
            value={selectedChain || ''}
            onChange={e => setSelectedChain(e.currentTarget.value)}
            aria-label="Select Chain"
            style={{ width: '100%' }}
          >
            <option value="">Select Chain</option>
            {allowedChains.map((chain, index) => {
              return (
                <option key={index} value={chain.id}>
                  {chain.name}
                </option>
              )
            })}
          </select>
        </div>
      </Row>
      <Row justify="space-between" align="center" css={{ marginBottom: '$5' }}>
        <Text css={{ flexGrow: 1 }} h4>
          Type
        </Text>
        <div style={{ flexGrow: 1, maxWidth: '50%' }}>
          <select
            id="moduleType"
            value={moduleType}
            onChange={e => setModuleType(e.target.value)}
            aria-label="Select Module Type"
            style={{ width: '100%' }}
          >
            <option value="">Select Module Type</option>
            {Object.entries(moduleTypeIds).map(([key, value]) => (
              <option key={value} value={value}>
                {key.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </Row>

      <Row justify="space-between" align="center" css={{ marginBottom: '$5' }}>
        <Text css={{ flexGrow: 1 }} h4>
          Module
        </Text>
        <div style={{ flexGrow: 1, maxWidth: '50%' }}>
          <select
            id="module"
            value={module}
            onChange={e => setModule(e.target.value)}
            aria-label="Select Module"
            disabled={!moduleType}
            style={{ width: '100%' }}
          >
            <option value="">Select Module</option>
            {filteredModules.map(mod => (
              <option key={mod.moduleAddress} value={mod.moduleAddress}>
                {mod.name}
              </option>
            ))}
          </select>
        </div>
      </Row>

      <Row justify="space-between" align="center" css={{ marginBottom: '$5' }}>
        <Text css={{ flexGrow: 1 }} h4>
          Initdata
        </Text>
        <div style={{ flexGrow: 1, maxWidth: '50%' }}>
          <Textarea bordered placeholder="0x..." aria-label="Module InitCode" disabled />
        </div>
      </Row>

      <Row justify="flex-end" align="center" css={{ marginBottom: '$5' }}>
        <Button auto disabled={!moduleType || !module || !selectedChain} onClick={onInstall}>
          {isLoading ? <Loading type="points" color="currentColor" size="sm" /> : 'Install'}
        </Button>
      </Row>
    </Fragment>
  )
}

export default InstallModuleForm
