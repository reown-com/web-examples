import { parseUri } from '@walletconnect/utils'
import PageHeader from '@/components/PageHeader'
import QrReader from '@/components/QrReader'
import { web3wallet } from '@/utils/WalletConnectUtil'
import { Button, Input, Loading, Text } from '@nextui-org/react'
import { Fragment, useEffect, useState } from 'react'
import { styledToast } from '@/utils/HelperUtil'
import ModalStore from '@/store/ModalStore'

export default function WalletConnectPage(params: { deepLink?: string }) {
  const { deepLink } = params
  const [uri, setUri] = useState('')
  const [loading, setLoading] = useState(false)

  async function onConnect(uri: string) {
    const { topic: pairingTopic } = parseUri(uri)
    // if for some reason, the proposal is not received, we need to close the modal when the pairing expires (5mins)
    const pairingExpiredListener = ({ topic }: { topic: string }) => {
      if (pairingTopic === topic) {
        styledToast('Pairing expired. Please try again with new Connection URI', 'error')
        ModalStore.close()
        web3wallet.core.pairing.events.removeListener('pairing_expire', pairingExpiredListener)
      }
    }
    web3wallet.once('session_proposal', () => {
      web3wallet.core.pairing.events.removeListener('pairing_expire', pairingExpiredListener)
    })
    try {
      setLoading(true)
      web3wallet.core.pairing.events.on('pairing_expire', pairingExpiredListener)
      await web3wallet.pair({ uri })
    } catch (error) {
      styledToast((error as Error).message, 'error')
      ModalStore.close()
    } finally {
      setLoading(false)
      setUri('')
    }
  }

  useEffect(() => {
    if (deepLink) {
      onConnect(deepLink)
    }
  }, [deepLink])

  return (
    <Fragment>
      <PageHeader title="WalletConnect" />
      <>
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
          data-testid="uri-input"
          contentRight={
            <Button
              size="xs"
              disabled={!uri}
              css={{ marginLeft: -60 }}
              onClick={() => onConnect(uri)}
              color="gradient"
              data-testid="uri-connect-button"
            >
              {loading ? <Loading size="md" type="points" color={'white'} /> : 'Connect'}
            </Button>
          }
        />
      </>
    </Fragment>
  )
}
