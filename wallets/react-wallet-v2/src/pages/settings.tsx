import PageHeader from '@/components/PageHeader'
import WalletStore from '@/store/WalletStore'
import { Card, Divider, Row, Switch, Text } from '@nextui-org/react'
import { Fragment } from 'react'

export default function SettingsPage() {
  return (
    <Fragment>
      <PageHeader>Settings</PageHeader>
      <Text h4 css={{ marginBottom: '$5' }}>
        Mnemonic
      </Text>
      <Card bordered borderWeight="light">
        <Text css={{ fontFamily: '$mono' }}>{WalletStore.state.wallet?.mnemonic.phrase}</Text>
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
        <Switch /> <Text>Dissabled</Text>
      </Row>

      <Divider y={3} />

      <Text h4 css={{ marginBottom: '$5' }}>
        Theme
      </Text>
      <Row justify="space-between" align="center">
        <Switch /> <Text>Dark</Text>
      </Row>
    </Fragment>
  )
}
