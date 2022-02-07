import PageHeader from '@/components/PageHeader'
import { client } from '@/utils/WalletConnectUtil'
import { Button, Input, Loading } from '@nextui-org/react'
import { Fragment, useState } from 'react'

export default function WalletConnectPage() {
  const [uri, setUri] = useState('')
  const [loading, setLoading] = useState(false)

  async function onConnect() {
    try {
      setLoading(true)
      await client?.pair({ uri })
    } catch (err: unknown) {
      alert(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Fragment>
      <PageHeader>WalletConnect</PageHeader>
      <Input
        bordered
        label="WalletConnect URI"
        placeholder="e.g. wc:a281567bb3e4..."
        onChange={e => setUri(e.target.value)}
        value={uri}
        contentRight={
          <Button size="xs" disabled={!uri} css={{ marginLeft: -60 }} onClick={onConnect}>
            {loading ? <Loading size="sm" /> : 'Connect'}
          </Button>
        }
      />
    </Fragment>
  )
}
