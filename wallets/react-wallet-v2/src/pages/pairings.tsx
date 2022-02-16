import PageHeader from '@/components/PageHeader'
import { walletConnectClient } from '@/utils/WalletConnectUtil'
import { Fragment } from 'react'

export default function PairingsPage() {
  console.log(walletConnectClient.session.values)
  console.log(walletConnectClient.session.history.pending)

  return (
    <Fragment>
      <PageHeader>Pairings</PageHeader>
    </Fragment>
  )
}
