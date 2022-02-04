import PageHeader from '@/components/PageHeader'
import WalletStore from '@/store/WalletStore'
import { useSnapshot } from 'valtio'

export default function HomePage() {
  const { wallet } = useSnapshot(WalletStore.state)

  return <PageHeader>Accounts</PageHeader>
}
