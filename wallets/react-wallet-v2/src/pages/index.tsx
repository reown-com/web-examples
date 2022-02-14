import AccountCard from '@/components/AccountCard'
import PageHeader from '@/components/PageHeader'
import { EIP155_CHAINS } from '@/data/EIP155Data'
import { wallet } from '@/utils/WalletUtil'
import { Fragment } from 'react'

export default function HomePage() {
  return (
    <Fragment>
      <PageHeader>Accounts</PageHeader>
      {Object.values(EIP155_CHAINS).map(({ name, logo, rgb }) => (
        <AccountCard key={name} name={name} logo={logo} rgb={rgb} address={wallet.address} />
      ))}
    </Fragment>
  )
}
