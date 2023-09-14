import AccountCard from '@/components/AccountCard'
import AccountPicker from '@/components/AccountPicker'
import PageHeader from '@/components/PageHeader'
import { EIP155_MAINNET_CHAINS, EIP155_TEST_CHAINS } from '@/data/EIP155Data'
import SettingsStore from '@/store/SettingsStore'
import { Text } from '@nextui-org/react'
import { Fragment } from 'react'
import { useSnapshot } from 'valtio'

export default function HomePage() {
  const { testNets, eip155Address, cosmosAddress, solanaAddress, polkadotAddress } = useSnapshot(
    SettingsStore.state
  )

  return (
    <Fragment>
      <PageHeader title="Accounts">
        <AccountPicker />
      </PageHeader>
      <Text h4 css={{ marginBottom: '$5' }}>
        Mainnets
      </Text>
      {Object.values(EIP155_MAINNET_CHAINS).map(({ name, logo, rgb }) => (
        <AccountCard key={name} name={name} logo={logo} rgb={rgb} address={eip155Address} />
      ))}

      {testNets ? (
        <Fragment>
          <Text h4 css={{ marginBottom: '$5' }}>
            Testnets
          </Text>
          {Object.values(EIP155_TEST_CHAINS).map(({ name, logo, rgb }) => (
            <AccountCard key={name} name={name} logo={logo} rgb={rgb} address={eip155Address} />
          ))}
        </Fragment>
      ) : null}
    </Fragment>
  )
}
