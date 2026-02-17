import { parseUri } from '@walletconnect/utils'
import PageHeader from '@/components/PageHeader'
import QrReader from '@/components/QrReader'
import { walletkit, isPaymentLink } from '@/utils/WalletConnectUtil'
import { Button, Input, Loading, Text } from '@nextui-org/react'
import { Fragment, useEffect, useState } from 'react'
import { styledToast } from '@/utils/HelperUtil'
import ModalStore from '@/store/ModalStore'
import PaymentStore from '@/store/PaymentStore'
import SettingsStore from '@/store/SettingsStore'
import { EIP155_CHAINS } from '@/data/EIP155Data'

export default function WalletConnectPage(params: { deepLink?: string }) {
  const { deepLink } = params
  const [uri, setUri] = useState('')
  const [loading, setLoading] = useState(false)

  async function onConnect(uri: string) {
    if (isPaymentLink(uri)) {
      const payClient = walletkit?.pay
      if (!payClient) {
        styledToast('Pay SDK not initialized. Please check your API key configuration.', 'error')
        return
      }

      PaymentStore.startPayment({
        loadingMessage: 'Preparing your payment...',
      })
      ModalStore.open('PaymentOptionsModal', {})

      try {
        const eip155Address = SettingsStore.state.eip155Address
        const accounts = eip155Address
          ? Object.keys(EIP155_CHAINS).map(
              chainKey => `${chainKey}:${eip155Address}`,
            )
          : []

        const paymentOptions = await payClient.getPaymentOptions({
          paymentLink: uri,
          accounts,
          includePaymentInfo: true,
        })

        console.log('[Pay] getPaymentOptions response:', JSON.stringify(paymentOptions, null, 2))
        console.log('[Pay] Options with collectData:', paymentOptions.options?.map(o => ({
          id: o.id,
          symbol: o.amount.display.assetSymbol,
          network: o.amount.display.networkName,
          hasCollectDataUrl: !!o.collectData?.url,
          collectDataUrl: o.collectData?.url,
        })))

        PaymentStore.setPaymentOptions(paymentOptions)
      } catch (error: any) {
        PaymentStore.setError(
          error?.message || 'Failed to fetch payment options',
        )
      }

      setUri('')
      return
    }

    const { topic: pairingTopic } = parseUri(uri)
    const pairingExpiredListener = ({ topic }: { topic: string }) => {
      if (pairingTopic === topic) {
        styledToast('Pairing expired. Please try again with new Connection URI', 'error')
        ModalStore.close()
        walletkit.core.pairing.events.removeListener('pairing_expire', pairingExpiredListener)
      }
    }
    walletkit.once('session_proposal', () => {
      walletkit.core.pairing.events.removeListener('pairing_expire', pairingExpiredListener)
    })
    try {
      setLoading(true)
      walletkit.core.pairing.events.on('pairing_expire', pairingExpiredListener)
      await walletkit.pair({ uri })
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
          css={{
            width: '100%',
            '& > div': {
              border: '2px solid rgba(255, 255, 255, 0.15) !important',
              borderRadius: '14px',
              padding: '8px 12px'
            }
          }}
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
