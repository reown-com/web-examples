import PageHeader from '@/components/PageHeader'
import SettingsStore from '@/store/SettingsStore'
import { wallets } from '@/utils/WalletUtil'
import { Card, Divider, Row, Switch, Text } from '@nextui-org/react'
import { Fragment } from 'react'
import { useSnapshot } from 'valtio'

export default function SettingsPage() {
  const { testNets } = useSnapshot(SettingsStore.state)

  return (
    <Fragment>
      <PageHeader title="Settings" />
      <Text h4 css={{ marginBottom: '$5' }}>
        Mnemonic
      </Text>
      <Card bordered borderWeight="light" css={{ minHeight: '75px' }}>
        <Text css={{ fontFamily: '$mono' }}>
          {wallets['0xD0712a5018b6F3401b90Cd75C15d95B3353a4088'].mnemonic.phrase}
        </Text>
      </Card>

      <Text css={{ color: '$yellow500', marginTop: '$5', textAlign: 'center' }}>
        Warning: mnemonic is provided for development purposes only and should not be used
        elsewhere!
      </Text>

      <Divider y={3} />

      <Text h4 css={{ marginBottom: '$5' }}>
        Testnets
      </Text>
      <Row justify="space-between" align="center">
        <Switch checked={testNets} onChange={SettingsStore.toggleTestNets} />
        <Text>{testNets ? 'Enabled' : 'Disabled'}</Text>
      </Row>

      <Divider y={3} />
    </Fragment>
  )
}
