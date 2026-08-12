import PageHeader from '@/components/PageHeader'
import RelayRegionPicker from '@/components/RelayRegionPicker'
import SettingsStore from '@/store/SettingsStore'
import type { ExploreOpenMode } from '@/store/SettingsStore'
import { cosmosWallets } from '@/utils/CosmosWalletUtil'
import { eip155Wallets } from '@/utils/EIP155WalletUtil'
import { solanaWallets } from '@/utils/SolanaWalletUtil'
import { multiversxWallets } from '@/utils/MultiversxWalletUtil'
import { tronWallets } from '@/utils/TronWalletUtil'
import { kadenaWallets } from '@/utils/KadenaWalletUtil'
import { Card, Col, Row, Switch, Text } from '@nextui-org/react'
import StyledDivider from '@/components/StyledDivider'
import { Fragment } from 'react'
import { useSnapshot } from 'valtio'
import packageJSON from '../../package.json'
import { tezosWallets } from '@/utils/TezosWalletUtil'

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
    explorerAutoConnectEnabled,
    explorerConnectVariant,
    explorerOpenMode
  } = useSnapshot(SettingsStore.state)

  const OPEN_MODES: { id: ExploreOpenMode; label: string; desc: string }[] = [
    {
      id: 'iframe',
      label: 'Embedded (iframe)',
      desc: 'Opens inside the Dapps tab; sign prompts appear over it. Needs the dapp to allow framing.'
    },
    {
      id: 'popup',
      label: 'Popup window',
      desc: 'Opens in a small first-party window. Works even if the dapp blocks framing.'
    },
    {
      id: 'newtab',
      label: 'New tab',
      desc: 'Opens in a full browser tab.'
    }
  ]

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

      <StyledDivider css={{ my: '$8' }} />

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

      <StyledDivider css={{ my: '$8' }} />

      <Row>
        <Col>
          <Text h4 css={{ marginBottom: '$5' }}>
            Dapps auto-connect (Dapp Picker POC)
          </Text>
          <Row justify="space-between" align="center">
            <Switch
              checked={explorerAutoConnectEnabled}
              onChange={SettingsStore.toggleExplorerAutoConnect}
              data-testid="settings-toggle-explore-autoconnect"
            />
            <Text>{explorerAutoConnectEnabled ? 'Enabled' : 'Disabled'}</Text>
          </Row>
          <Text small css={{ color: '$gray500', marginTop: '$3' }}>
            When on, dapps opened from the Dapps tab connect without an approval
            screen. Signing is never auto-approved.
          </Text>

          <Text h4 css={{ marginBottom: '$5', marginTop: '$8' }}>
            Dapps open mode
          </Text>
          <Text small css={{ color: '$gray500', marginBottom: '$5' }}>
            How a Dapps tile opens (all auto-connect the same way).
          </Text>
          <div>
            {OPEN_MODES.map(option => {
              const selected = explorerOpenMode === option.id
              return (
                <div
                  key={option.id}
                  onClick={() => SettingsStore.setExplorerOpenMode(option.id)}
                  data-testid={`settings-open-mode-${option.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    cursor: 'pointer',
                    padding: '12px 14px',
                    marginBottom: 8,
                    borderRadius: 12,
                    border: selected ? '1px solid #2E5CFF' : '1px solid #e6e8ec',
                    background: selected ? '#eaf0ff' : 'transparent'
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      flexShrink: 0,
                      border: `2px solid ${selected ? '#2E5CFF' : '#c2c6cc'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {selected && (
                      <div
                        style={{ width: 8, height: 8, borderRadius: '50%', background: '#2E5CFF' }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: selected ? '#2E5CFF' : '#1a1d23' }}>
                      {option.label}
                      {option.id === 'iframe' ? ' — default' : ''}
                    </div>
                    <div style={{ fontSize: 13, color: '#8a8f98', marginTop: 2 }}>{option.desc}</div>
                  </div>
                </div>
              )
            })}
          </div>

          <Text h4 css={{ marginBottom: '$5', marginTop: '$8' }}>
            Dapps connect variant
          </Text>
          <Row justify="space-between" align="center">
            <Switch
              checked={explorerConnectVariant === 'headless'}
              onChange={SettingsStore.toggleExplorerConnectVariant}
              data-testid="settings-toggle-explore-variant"
            />
            <Text>{explorerConnectVariant === 'headless' ? 'Headless' : 'Provider-direct'}</Text>
          </Row>
          <Text small css={{ color: '$gray500', marginTop: '$3' }}>
            Which URI-acquisition variant the Dapps tiles request
            (<code>connect=headless</code> vs <code>connect=provider</code>).
          </Text>
        </Col>
      </Row>

      <StyledDivider css={{ my: '$8' }} />

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

      <StyledDivider css={{ my: '$8' }} />

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
                  <StyledDivider css={{ my: '$8' }} />
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

      <StyledDivider css={{ my: '$8' }} />

      <Row justify="space-between" align="center">
        <Text h4 css={{ marginBottom: '$5' }}>
          Relayer Region
        </Text>
        <RelayRegionPicker />
      </Row>

      <StyledDivider css={{ my: '$8' }} />

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
