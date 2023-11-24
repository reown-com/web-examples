import PageHeader from '@/components/PageHeader'
import RelayRegionPicker from '@/components/RelayRegionPicker'
import SettingsStore from '@/store/SettingsStore'
import { cosmosWallets } from '@/utils/CosmosWalletUtil'
import { eip155Wallets } from '@/utils/EIP155WalletUtil'
import { solanaWallets } from '@/utils/SolanaWalletUtil'
import { multiversxWallets } from '@/utils/MultiversxWalletUtil'
import { tronWallets } from '@/utils/TronWalletUtil'
import { kadenaWallets } from '@/utils/KadenaWalletUtil'
import { Card, Divider, Row, Switch, Text } from '@nextui-org/react'
import { Fragment } from 'react'
import { useSnapshot } from 'valtio'
import packageJSON from '../../package.json'
import { tezosWallets } from '@/utils/TezosWalletUtil'

export default function SettingsPage() {
  const {
    testNets,
    eip155Address,
    cosmosAddress,
    solanaAddress,
    multiversxAddress,
    tronAddress,
    tezosAddress,
    kadenaAddress
  } = useSnapshot(SettingsStore.state)

  return (
    <Fragment>
      <PageHeader title="Settings" />

      <Text h4 css={{ marginBottom: '$5' }}>
        Packages
      </Text>
      <Row justify="space-between" align="center">
        <Text color="$gray400">@walletconnect/sign-client</Text>
        <Text color="$gray400">{packageJSON.dependencies['@walletconnect/web3wallet']}</Text>
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
