import PageHeader from '@/components/PageHeader'
import RelayRegionPicker from '@/components/RelayRegionPicker'
import SettingsStore from '@/store/SettingsStore'
import { cosmosWallets } from '@/utils/CosmosWalletUtil'
import { eip155Wallets, eip155Addresses } from '@/utils/EIP155WalletUtil'
import { solanaWallets } from '@/utils/SolanaWalletUtil'
import { multiversxWallets } from '@/utils/MultiversxWalletUtil'
import { tronWallets } from '@/utils/TronWalletUtil'
import { kadenaWallets } from '@/utils/KadenaWalletUtil'
import { Button, Card, Col, Divider, Loading, Row, Switch, Text } from '@nextui-org/react'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'
import packageJSON from '../../package.json'
import { tezosWallets } from '@/utils/TezosWalletUtil'
import useKyc from '@/hooks/useKyc'

export default function SettingsPage() {
  const {
    testNets,
    smartAccountSponsorshipEnabled,
    eip155Address,
    cosmosAddress,
    solanaAddress,
    multiversxAddress,
    tronAddress,
    tezosAddress,
    kadenaAddress,
    smartAccountEnabled,
    kernelSmartAccountEnabled,
    safeSmartAccountEnabled,
    biconomySmartAccountEnabled,
    moduleManagementEnabled,
    chainAbstractionEnabled,
    walletConnectPayEnabled,
    selectedKycAddress
  } = useSnapshot(SettingsStore.state)

  const {
    checkKycStatus,
    initiateKyc,
    isLoading: isKycLoading,
    kycStatus,
    getKycStatusForAddress
  } = useKyc()
  const [isCheckingKyc, setIsCheckingKyc] = useState(false)

  // Get all available EIP155 addresses
  const availableAddresses = useMemo(() => {
    return eip155Addresses || []
  }, [])

  // Initialize selected KYC address if not set
  useEffect(() => {
    if (!selectedKycAddress && availableAddresses.length > 0) {
      SettingsStore.setSelectedKycAddress(availableAddresses[0])
    }
  }, [selectedKycAddress, availableAddresses])

  // Refresh KYC status when address changes or WalletConnect Pay is enabled
  useEffect(() => {
    if (walletConnectPayEnabled && selectedKycAddress) {
      checkKycStatus(selectedKycAddress)
    }
  }, [selectedKycAddress, walletConnectPayEnabled, checkKycStatus])

  // Format address for display (truncate)
  const formatAddress = (address: string) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Check KYC status when WalletConnect Pay is enabled
  const handleWalletConnectPayToggle = useCallback(async () => {
    const newState = !walletConnectPayEnabled

    if (newState) {
      // When enabling, first check KYC status
      setIsCheckingKyc(true)
      try {
        const status = await checkKycStatus()
        if (status !== 'approved') {
          // KYC required, open modal
          initiateKyc()
        }
        // Enable the feature regardless (user can complete KYC later)
        SettingsStore.setWalletConnectPayEnabled(true)
      } catch (error) {
        console.error('Error checking KYC status:', error)
        // Still enable the feature, KYC can be completed later
        SettingsStore.setWalletConnectPayEnabled(true)
      } finally {
        setIsCheckingKyc(false)
      }
    } else {
      // Simply disable
      SettingsStore.setWalletConnectPayEnabled(false)
    }
  }, [walletConnectPayEnabled, checkKycStatus, initiateKyc])

  // Get KYC status display info
  const getKycStatusInfo = () => {
    switch (kycStatus) {
      case 'approved':
        return { text: 'Verified ✅', color: '$success' }
      case 'pending':
        return { text: 'Pending Review ⏳', color: '$warning' }
      case 'rejected':
        return { text: 'Rejected ❌', color: '$error' }
      default:
        return { text: 'Not Verified', color: '$gray400' }
    }
  }

  const kycStatusInfo = getKycStatusInfo()

  return (
    <Fragment>
      <PageHeader title="Settings" />

      <Text h4 css={{ marginBottom: '$5' }}>
        Packages
      </Text>
      <Row justify="space-between" align="center">
        <Text color="$gray400">@reown/walletkit</Text>
        <Text color="$gray400">{packageJSON.dependencies['@reown/walletkit']}</Text>
      </Row>

      <Divider y={2} />

      <Text h4 css={{ marginBottom: '$5' }}>
        Testnets
      </Text>
      <Row justify="space-between" align="center">
        <Switch
          checked={testNets}
          onChange={SettingsStore.toggleTestNets}
          data-testid="settings-toggle-testnets"
        />
        <Text>{testNets ? 'Enabled' : 'Disabled'}</Text>
      </Row>

      <Divider y={2} />

      <Row>
        <Col>
          <Text h4 css={{ marginBottom: '$5' }}>
            Chain Abstraction
          </Text>
          {testNets ? (
            <>
              <Row justify="space-between" align="center">
                <Switch
                  checked={chainAbstractionEnabled}
                  onChange={SettingsStore.toggleChainAbstractionEnabled}
                  data-testid="settings-toggle-chain-abstraction-enabled"
                />
                <Text>{chainAbstractionEnabled ? 'Enabled' : 'Disabled'}</Text>
              </Row>
            </>
          ) : (
            <Text color="$gray400">This feature requires testnets</Text>
          )}
        </Col>
      </Row>

      <Divider y={2} />

      <Row>
        <Col>
          <Text h4 css={{ marginBottom: '$5' }}>
            WalletConnect Pay
          </Text>
          <Row justify="space-between" align="center">
            <Switch
              checked={walletConnectPayEnabled}
              onChange={handleWalletConnectPayToggle}
              disabled={isCheckingKyc}
              data-testid="settings-toggle-walletconnect-pay"
            />
            <Text>
              {isCheckingKyc ? <Loading size="xs" css={{ marginRight: '$2' }} /> : null}
              {walletConnectPayEnabled ? 'Enabled' : 'Disabled'}
            </Text>
          </Row>

          {walletConnectPayEnabled && (
            <>
              <Text css={{ marginTop: '$10', marginBottom: '$5' }} color="$gray400" size="$sm">
                Select Account for KYC:
              </Text>
              <Row css={{ gap: '$4', flexWrap: 'wrap' }}>
                {availableAddresses.map((addr, index) => {
                  const status = getKycStatusForAddress(addr)
                  const isSelected = (selectedKycAddress || eip155Address) === addr
                  const statusIcon =
                    status === 'approved'
                      ? ' ✅'
                      : status === 'pending'
                      ? ' ⏳'
                      : status === 'rejected'
                      ? ' ❌'
                      : ''
                  return (
                    <Button
                      key={addr}
                      auto
                      size="sm"
                      flat={!isSelected}
                      color={isSelected ? 'primary' : 'default'}
                      onClick={() => SettingsStore.setSelectedKycAddress(addr)}
                      css={{
                        fontFamily: '$mono',
                        fontSize: '$xs',
                        border: isSelected ? '2px solid $primary' : '1px solid $accents3'
                      }}
                    >
                      Account {index + 1}: {formatAddress(addr)}
                      {statusIcon}
                    </Button>
                  )
                })}
              </Row>

              <Row justify="space-between" align="center" css={{ marginTop: '$10' }}>
                <Text color="$gray400">KYC Status:</Text>
                <Text color={kycStatusInfo.color}>{kycStatusInfo.text}</Text>
              </Row>

              {kycStatus !== 'approved' && (
                <Row css={{ marginTop: '$5' }}>
                  <Button
                    auto
                    size="sm"
                    color={kycStatus === 'rejected' ? 'error' : 'primary'}
                    onClick={initiateKyc}
                    disabled={isKycLoading}
                  >
                    {kycStatus === 'rejected' ? 'Retry Verification' : 'Complete Verification'}
                  </Button>
                </Row>
              )}

              {kycStatus === 'pending' && (
                <Row css={{ marginTop: '$5' }}>
                  <Button
                    auto
                    size="sm"
                    flat
                    color="warning"
                    onClick={() => checkKycStatus()}
                    disabled={isKycLoading}
                  >
                    {isKycLoading ? <Loading size="xs" /> : 'Refresh Status'}
                  </Button>
                </Row>
              )}
            </>
          )}
        </Col>
      </Row>

      <Divider y={2} />

      <Row>
        <Col>
          <Text h4 css={{ marginBottom: '$5' }}>
            Smart Accounts
          </Text>
          {testNets ? (
            <>
              <Row justify="space-between" align="center">
                <Switch
                  checked={smartAccountEnabled}
                  onChange={SettingsStore.toggleSmartAccountEnabled}
                  data-testid="settings-toggle-smart-account-enabled"
                />
                <Text>{smartAccountEnabled ? 'Enabled' : 'Disabled'}</Text>
              </Row>

              {smartAccountEnabled ? (
                <>
                  <Text h4 css={{ marginBottom: '$5', marginTop: '$5' }}>
                    ZeroDev Smart Account
                  </Text>
                  <Row justify="space-between" align="center">
                    <Switch
                      checked={kernelSmartAccountEnabled}
                      onChange={SettingsStore.toggleKernelSmartAccountsEnabled}
                      data-testid="settings-toggle-smart-account-sponsorship"
                    />
                    <Text>{kernelSmartAccountEnabled ? 'Enabled' : 'Disabled'}</Text>
                  </Row>

                  <Text h4 css={{ marginBottom: '$5', marginTop: '$5' }}>
                    Safe Smart Account
                  </Text>
                  <Row justify="space-between" align="center">
                    <Switch
                      checked={safeSmartAccountEnabled}
                      onChange={SettingsStore.toggleSafeSmartAccountsEnabled}
                      data-testid="settings-toggle-smart-account-sponsorship"
                    />
                    <Text>{safeSmartAccountEnabled ? 'Enabled' : 'Disabled'}</Text>
                  </Row>

                  <Text h4 css={{ marginBottom: '$5', marginTop: '$5' }}>
                    Biconomy Smart Account
                  </Text>
                  <Row justify="space-between" align="center">
                    <Switch
                      checked={biconomySmartAccountEnabled}
                      onChange={SettingsStore.toggleBiconomySmartAccountsEnabled}
                      data-testid="settings-toggle-smart-account-sponsorship"
                    />
                    <Text>{biconomySmartAccountEnabled ? 'Enabled' : 'Disabled'}</Text>
                  </Row>

                  <Text h4 css={{ marginBottom: '$5', marginTop: '$5' }}>
                    Sponsorship (Pimlico)
                  </Text>
                  <Row justify="space-between" align="center">
                    <Switch
                      checked={smartAccountSponsorshipEnabled}
                      onChange={SettingsStore.toggleSmartAccountSponsorship}
                      data-testid="settings-toggle-smart-account-sponsorship"
                    />
                    <Text>{smartAccountSponsorshipEnabled ? 'Enabled' : 'Disabled'}</Text>
                  </Row>
                  <Divider y={2} />
                  <Text h4 css={{ marginBottom: '$5', cursor: 'pointer' }}>
                    Module Management
                  </Text>
                  <Row justify="space-between" align="center">
                    <Switch
                      disabled={
                        !kernelSmartAccountEnabled &&
                        !safeSmartAccountEnabled &&
                        !biconomySmartAccountEnabled
                      }
                      checked={moduleManagementEnabled}
                      onChange={SettingsStore.toggleModuleManagement}
                      data-testid="settings-toggle-module-management"
                    />
                    <Text>{moduleManagementEnabled ? 'Enabled' : 'Disabled'}</Text>
                  </Row>
                </>
              ) : null}
            </>
          ) : (
            <Text color="$gray400">This feature requires testnets</Text>
          )}
        </Col>
      </Row>

      <Divider y={2} />

      <Row justify="space-between" align="center">
        <Text h4 css={{ marginBottom: '$5' }}>
          Relayer Region
        </Text>
        <RelayRegionPicker />
      </Row>

      <Divider y={2} />

      <Text css={{ color: '$yellow500', marginBottom: '$5', textAlign: 'left', padding: 0 }}>
        Warning: mnemonics and secret keys are provided for development purposes only and should not
        be used elsewhere!
      </Text>

      <Text h4 css={{ marginTop: '$5', marginBottom: '$5' }}>
        EIP155 Mnemonic
      </Text>
      <Card bordered borderWeight="light" css={{ minHeight: '100px' }}>
        <Text css={{ fontFamily: '$mono' }}>{eip155Wallets[eip155Address].getMnemonic()}</Text>
      </Card>

      <Text h4 css={{ marginTop: '$10', marginBottom: '$5' }}>
        Cosmos Mnemonic
      </Text>
      <Card bordered borderWeight="light" css={{ minHeight: '100px' }}>
        <Text css={{ fontFamily: '$mono' }}>{cosmosWallets[cosmosAddress].getMnemonic()}</Text>
      </Card>

      <Text h4 css={{ marginTop: '$10', marginBottom: '$5' }}>
        Solana Secret Key
      </Text>
      <Card bordered borderWeight="light" css={{ minHeight: '215px', wordWrap: 'break-word' }}>
        <Text css={{ fontFamily: '$mono' }}>{solanaWallets[solanaAddress].getSecretKey()}</Text>
      </Card>

      <Text h4 css={{ marginTop: '$10', marginBottom: '$5' }}>
        MultiversX Mnemonic
      </Text>
      <Card bordered borderWeight="light" css={{ minHeight: '215px', wordWrap: 'break-word' }}>
        <Text css={{ fontFamily: '$mono' }}>
          {multiversxWallets[multiversxAddress].getMnemonic()}
        </Text>
      </Card>

      <Text h4 css={{ marginTop: '$10', marginBottom: '$5' }}>
        Tron Private Key
      </Text>
      <Card bordered borderWeight="light" css={{ minHeight: '100px', wordWrap: 'break-word' }}>
        <Text css={{ fontFamily: '$mono' }}>{tronWallets[tronAddress].privateKey}</Text>
      </Card>

      <Text h4 css={{ marginTop: '$10', marginBottom: '$5' }}>
        Tezos Mnemonic
      </Text>
      <Card bordered borderWeight="light" css={{ minHeight: '100px', wordWrap: 'break-word' }}>
        <Text css={{ fontFamily: '$mono' }}>{tezosWallets[tezosAddress].getMnemonic()}</Text>
      </Card>

      <Text h4 css={{ marginTop: '$10', marginBottom: '$5' }}>
        Kadena Secret Key
      </Text>
      <Card bordered borderWeight="light" css={{ wordWrap: 'break-word' }}>
        <Text css={{ fontFamily: '$mono' }}>{kadenaWallets[kadenaAddress].getSecretKey()}</Text>
      </Card>

      <Text h4 css={{ marginTop: '$10', marginBottom: '$5' }}></Text>
    </Fragment>
  )
}
