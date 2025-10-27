import { Button, Modal, Text, Spacer, Row, Container, Loading } from '@nextui-org/react'
import { Fragment, useCallback, useState, useMemo } from 'react'

import ModalStore from '@/store/ModalStore'
import { walletkit } from '@/utils/WalletConnectUtil'
import { styledToast } from '@/utils/HelperUtil'
import OrderInfoCard from '@/components/OrderInfoCard'
import Products from '@/components/Products'
import {
  CheckoutRequest,
  DetailedPaymentOption,
  CheckoutResult,
  CheckoutError,
  CheckoutErrorCode
} from '@/types/wallet_checkout'
import PaymentOptions from '@/components/PaymentOptions'
import WalletCheckoutUtil from '@/utils/WalletCheckoutUtil'
import SettingsStore from '@/store/SettingsStore'
import { eip155Wallets } from '@/utils/EIP155WalletUtil'
import EIP155Lib from '@/lib/EIP155Lib'
import { providers } from 'ethers'
import { EIP155_CHAINS, TEIP155Chain } from '@/data/EIP155Data'
import WalletCheckoutPaymentHandler from '@/utils/WalletCheckoutPaymentHandler'
import WalletCheckoutCtrl from '@/store/WalletCheckoutCtrl'
import { solanaWallets } from '@/utils/SolanaWalletUtil'

// Custom styles for the modal
const modalStyles = {
  modal: {
    height: 'auto',
    minHeight: '600px',
    maxHeight: '80vh',
    width: '100%',
    maxWidth: '450px',
    display: 'flex',
    flexDirection: 'column' as const
  },
  modalBody: {
    padding: 0,
    flex: '1 1 auto',
    overflowY: 'auto' as const
  },
  footer: {
    padding: '24px',
    maxWidth: '100%',
    boxSizing: 'border-box' as const,
    marginTop: 'auto'
  },
  footerRow: {
    width: '100%',
    margin: '0',
    padding: '0',
    gap: '16px',
    maxWidth: '100%'
  },
  button: {
    flex: '1',
    maxWidth: 'calc(50% - 8px)'
  }
}

export default function SessionCheckoutModal() {
  const [isLoadingReject, setIsLoadingReject] = useState(false)
  const [isLoadingApprove, setIsLoadingApprove] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<DetailedPaymentOption | null>(null)
  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent
  const requestSession = ModalStore.state.data?.requestSession

  const topic = requestEvent?.topic
  const request = requestEvent?.params?.request
  const checkoutRequest = useMemo(() => request?.params?.[0] || ({} as CheckoutRequest), [request])

  // Use our custom hook to fetch payments
  const eip155Address = SettingsStore.state.eip155Address
  const solanaAddress = SettingsStore.state.solanaAddress
  const feasiblePayments = WalletCheckoutCtrl.state.feasiblePayments

  // Handle reject action
  const onReject = useCallback(async () => {
    if (!requestEvent || !topic) return

    try {
      setIsLoadingReject(true)

      const rejection = new CheckoutError(CheckoutErrorCode.USER_REJECTED, 'User rejected payment')

      const response = WalletCheckoutUtil.formatCheckoutErrorResponse(requestEvent.id, rejection)

      await walletkit.respondSessionRequest({ topic, response })
      styledToast('Payment rejected', 'info')
    } catch (e) {
      styledToast((e as Error).message, 'error')
    } finally {
      setIsLoadingReject(false)
      ModalStore.close()
    }
  }, [requestEvent, topic])

  // Get the appropriate wallet based on the selected payment's chain namespace
  const getWalletForPayment = (payment: DetailedPaymentOption) => {
    const { chainMetadata } = payment
    const { chainNamespace, chainId } = chainMetadata

    if (chainNamespace === 'eip155') {
      const wallet = eip155Wallets[eip155Address]
      if (!(wallet instanceof EIP155Lib)) {
        throw new Error('EVM wallet not available')
      }

      // Set up the provider
      const provider = new providers.JsonRpcProvider(
        EIP155_CHAINS[`eip155:${chainId}` as TEIP155Chain].rpc
      )
      return wallet.connect(provider)
    } else if (chainNamespace === 'solana') {
      const wallet = solanaWallets[solanaAddress]
      console.log({ solanaWallet: wallet })
      if (!wallet) {
        throw new Error('Solana wallet not available')
      }
      return wallet
    }

    throw new Error(`Unsupported chain namespace: ${chainNamespace}`)
  }

  // Handle approve action
  const onApprove = useCallback(async () => {
    if (!requestEvent || !topic || !selectedPayment) return

    try {
      setIsLoadingApprove(true)

      // Validate the request before processing
      WalletCheckoutPaymentHandler.validateCheckoutExpiry(checkoutRequest)

      // Get the wallet for this payment
      const wallet = getWalletForPayment(selectedPayment)

      // Process the payment using the unified method
      const result = await WalletCheckoutPaymentHandler.processPayment(wallet, selectedPayment)

      // Handle the result
      if (result.txHash) {
        const response = WalletCheckoutUtil.formatCheckoutSuccessResponse<CheckoutResult>(
          requestEvent.id,
          {
            orderId: checkoutRequest.orderId,
            txid: result.txHash,
            amount: selectedPayment.amount,
            asset: selectedPayment.asset,
            recipient: selectedPayment.recipient
          }
        )

        await walletkit.respondSessionRequest({ topic, response })
        styledToast('Payment approved successfully', 'success')
      }
    } catch (error) {
      // Handle any unexpected errors
      console.error('Error processing payment:', error)
      const response = WalletCheckoutUtil.formatCheckoutErrorResponse(requestEvent.id, error)

      await walletkit.respondSessionRequest({ topic, response })
      styledToast((error as Error).message, 'error')
    } finally {
      setIsLoadingApprove(false)
      ModalStore.close()
    }
  }, [checkoutRequest, requestEvent, selectedPayment, topic])

  // Handle payment selection
  const onSelectPayment = useCallback((payment: DetailedPaymentOption) => {
    setSelectedPayment(payment)
  }, [])

  // Ensure request and wallet are defined
  if (!requestEvent || !requestSession) {
    return <Text>Missing request data</Text>
  }

  return (
    <Fragment>
      <Modal.Body css={modalStyles.modalBody}>
        <Container
          css={{
            padding: 8,
            paddingTop: 12,
            backgroundColor: '#2A2A2A',
            borderRadius: '0 0 40px 40px'
          }}
        >
          <Text h4 css={{ paddingLeft: '8px' }}>
            Checkout
          </Text>
          {/* Products */}
          <Products products={checkoutRequest.products} />

          {/* Payment Options */}
          <PaymentOptions payments={feasiblePayments} onSelectPayment={onSelectPayment} />
        </Container>
        <Container>
          <OrderInfoCard
            orderId={checkoutRequest.orderId}
            expiry={checkoutRequest.expiry}
            selectedPayment={selectedPayment}
            metadata={requestSession.peer.metadata}
          />
        </Container>
      </Modal.Body>

      <Container css={modalStyles.footer}>
        <Row justify="space-between" css={modalStyles.footerRow}>
          <Button
            auto
            css={modalStyles.button}
            color="error"
            onClick={onReject}
            disabled={isLoadingApprove || isLoadingReject}
          >
            Cancel
          </Button>
          <Button
            auto
            css={modalStyles.button}
            color="success"
            onClick={onApprove}
            disabled={isLoadingApprove || isLoadingReject || !selectedPayment}
          >
            {isLoadingApprove ? <Loading size="md" type="points" /> : 'Pay'}
          </Button>
        </Row>
      </Container>
    </Fragment>
  )
}
