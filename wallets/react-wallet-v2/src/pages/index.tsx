import AccountCard from '@/components/AccountCard'
import PageHeader from '@/components/PageHeader'
import WalletStore from '@/store/WalletStore'
import { MAINNET_CHAINS } from '@/utils/EIP155ChainsUtil'
import { Fragment } from 'react'
import { useSnapshot } from 'valtio'

export default function HomePage() {
  const { wallet } = useSnapshot(WalletStore.state)

  return (
    <Fragment>
      <PageHeader>Accounts</PageHeader>
      {Object.values(MAINNET_CHAINS).map(({ name, logo, rgb }) => (
        <AccountCard key={name} name={name} logo={logo} rgb={rgb} address={wallet.address} />
      ))}
    </Fragment>
  )
}
