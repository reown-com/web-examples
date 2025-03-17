import { Button, Divider, Modal, Text, Spacer, Row, Container, Loading } from '@nextui-org/react'
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
    paddingBottom: 0,
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
  const address = SettingsStore.state.eip155Address
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

  // Handle approve action
  const onApprove = useCallback(async () => {
    if (!requestEvent || !topic || !selectedPayment) return

    try {
      setIsLoadingApprove(true)

      // Validate the request before processing
      WalletCheckoutPaymentHandler.validateCheckoutExpiry(checkoutRequest)

      const wallet = eip155Wallets[address]

      if (!(wallet instanceof EIP155Lib)) {
        throw new Error('Wallet not available')
      }

      // Set up the provider
      const { chainMetadata } = selectedPayment
      const { chainId } = chainMetadata
      const provider = new providers.JsonRpcProvider(
        EIP155_CHAINS[`eip155:${chainId}` as TEIP155Chain].rpc
      )
      const connectedWallet = wallet.connect(provider)

      // Process the payment using the unified method
      const result = await WalletCheckoutPaymentHandler.processPayment(
        connectedWallet,
        selectedPayment
      )

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
      const response = WalletCheckoutUtil.formatCheckoutErrorResponse(
        requestEvent.id,
        error
      )

      await walletkit.respondSessionRequest({ topic, response })
      styledToast((error as Error).message, 'error')
    } finally {
      setIsLoadingApprove(false)
      ModalStore.close()
    }
  }, [checkoutRequest, requestEvent, selectedPayment, topic, address])

  // Handle payment selection
  const onSelectPayment = useCallback((payment: DetailedPaymentOption) => {
    setSelectedPayment(payment)
  }, [])

  return (
    <Fragment>
      <Modal.Header>
        <Text h3>Checkout</Text>
      </Modal.Header>

      <Modal.Body css={modalStyles.modalBody}>
        <Container css={{ padding: 0 }}>
          {/* Products */}
          <Products products={checkoutRequest.products} />
          <Divider y={2} />

          {/* Payment Options */}
          <PaymentOptions payments={feasiblePayments} onSelectPayment={onSelectPayment} />
          <Divider y={2} />
          {/* Order Information */}
          <OrderInfoCard orderId={checkoutRequest.orderId} expiry={checkoutRequest.expiry} />

          <Spacer y={5} />
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
