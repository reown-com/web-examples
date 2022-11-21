import { parseUri } from '@walletconnect/utils'
import PageHeader from '@/components/PageHeader'
import QrReader from '@/components/QrReader'
import { signClient } from '@/utils/WalletConnectUtil'
import { createLegacySignClient } from '@/utils/LegacyWalletConnectUtil'
import { Button, Input, Loading, Text } from '@nextui-org/react'
import { Fragment, useState } from 'react'

export default function WalletConnectPage() {
  const [uri, setUri] = useState('')
  const [loading, setLoading] = useState(false)

  async function onConnect(uri: string) {
    try {
      setLoading(true)
      const { version } = parseUri(uri)

      // Route the provided URI to the v1 SignClient if URI version indicates it, else use v2.
      if (version === 1) {
        createLegacySignClient({ uri })
      } else {
        await signClient.pair({ uri })
      }
    } catch (err: unknown) {
      alert(err)
    } finally {
      setUri('')
      setLoading(false)
    }
  }

  return (
    <Fragment>
      <PageHeader title="WalletConnect" />

      <QrReader onConnect={onConnect} />

      <Text size={13} css={{ textAlign: 'center', marginTop: '$10', marginBottom: '$10' }}>
        or use walletconnect uri
      </Text>

      <Input
        css={{ width: '100%' }}
        bordered
        aria-label="wc url connect input"
        placeholder="e.g. wc:a281567bb3e4..."
        onChange={e => setUri(e.target.value)}
        value={uri}
        contentRight={
          <Button
            size="xs"
            disabled={!uri}
            css={{ marginLeft: -60 }}
            onClick={() => onConnect(uri)}
            color="gradient"
          >
            {loading ? <Loading size="sm" /> : 'Connect'}
          </Button>
        }
      />
    </Fragment>
  )
}
