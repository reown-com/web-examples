import AccountCard from '@/components/AccountCard'
import AccountPicker from '@/components/AccountPicker'
import PageHeader from '@/components/PageHeader'
import { EIP155_MAINNET_CHAINS, EIP155_TEST_CHAINS } from '@/data/EIP155Data'
import SettingsStore from '@/store/SettingsStore'
import { wallets } from '@/utils/WalletUtil'
import { Text } from '@nextui-org/react'
import { Fragment, useState } from 'react'
import { useSnapshot } from 'valtio'

export default function HomePage() {
  const [account, setAccount] = useState(0)
  const { testNets } = useSnapshot(SettingsStore.state)
  const addresses = Object.keys(wallets)

  return (
    <Fragment>
      <PageHeader title="Accounts">
        <AccountPicker value={account} onChange={e => setAccount(Number(e.currentTarget.value))} />
      </PageHeader>
      <Text h4 css={{ marginBottom: '$5' }}>
        Mainnets
      </Text>
      {Object.values(EIP155_MAINNET_CHAINS).map(({ name, logo, rgb }) => (
        <AccountCard key={name} name={name} logo={logo} rgb={rgb} address={addresses[account]} />
      ))}

      {testNets ? (
        <Fragment>
          <Text h4 css={{ marginBottom: '$5' }}>
            Testnets
          </Text>
          {Object.values(EIP155_TEST_CHAINS).map(({ name, logo, rgb }) => (
            <AccountCard
              key={name}
              name={name}
              logo={logo}
              rgb={rgb}
              address={addresses[account]}
            />
          ))}
        </Fragment>
      ) : null}
    </Fragment>
  )
}
