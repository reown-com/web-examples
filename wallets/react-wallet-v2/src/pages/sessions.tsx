import PageHeader from '@/components/PageHeader'
import { truncate } from '@/utils/HelperUtil'
import { walletConnectClient } from '@/utils/WalletConnectUtil'
import { useRouter } from 'next/router'
import { Fragment, useEffect } from 'react'

export default function SessionsPage() {
  const { query } = useRouter()
  const address = (query?.address as string) ?? 'Unknown'

  useEffect(() => {
    console.log(walletConnectClient.session.values)
  }, [])

  return (
    <Fragment>
      <PageHeader>{truncate(address, 15)}</PageHeader>
    </Fragment>
  )
}
