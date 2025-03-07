import { Button, Divider, Modal, Text, Spacer, Row, Container, Loading } from '@nextui-org/react'
import { Fragment, useCallback, useState, useEffect } from 'react'

import ModalStore from '@/store/ModalStore'
import { walletkit } from '@/utils/WalletConnectUtil'
import { styledToast } from '@/utils/HelperUtil'
import OrderInfoCard from '@/components/OrderInfoCard'
import ProductsSection from '@/components/ProductSectionComponent'
import { CheckoutRequest, Hex, DetailedPaymentOption, CheckoutResult } from '@/types/wallet_checkout'
import PaymentOptions from '@/components/PaymentOptions'
import WalletCheckoutUtil from '@/utils/WalletCheckoutUtil'
import SettingsStore from '@/store/SettingsStore'
import {eip155Wallets, } from '@/utils/EIP155WalletUtil'
import EIP155Lib from '@/lib/EIP155Lib'
import { providers } from 'ethers'
import { EIP155_CHAINS, TEIP155Chain } from '@/data/EIP155Data'
import WalletCheckoutPaymentHandler from '@/utils/WalletCheckoutPaymentHandler'
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { getSdkError } from '@walletconnect/utils'
import LoadingModal from './LoadingModal'

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
};

export default function SessionCheckoutModal() {
  const [isReadyToRender, setIsReadyToRender] = useState(false);
  const [feasiblePayments, setFeasiblePayments] = useState<DetailedPaymentOption[]>([]);
  const [isLoadingReject, setIsLoadingReject] = useState(false);
  const [isLoadingApprove, setIsLoadingApprove] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<DetailedPaymentOption | null>(null);
  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent;
  const requestSession = ModalStore.state.data?.requestSession;

  const topic = requestEvent?.topic;
  const chainId = requestEvent?.params?.chainId;
  const request = requestEvent?.params?.request;
   // Parse the request
   const { params, method } = request || {};
  const checkoutRequest = params[0] || {} as CheckoutRequest;

  // Handle reject action
  const onReject = useCallback(async () => {
    if (requestEvent && topic) {
      setIsLoadingReject(true);
      const response = formatJsonRpcError(requestEvent.id, getSdkError('USER_REJECTED').message)
      console.log({response})
      try {
        await walletkit.respondSessionRequest({
          topic,
          response
        });
      } catch (e) {
        setIsLoadingReject(false);
        styledToast((e as Error).message, 'error');
        return;
      }
      setIsLoadingReject(false);
      ModalStore.close();
    }
  }, [requestEvent, topic]);

  // Handle approve action
  const onApprove = useCallback(async () => {
    if (!requestEvent || !topic) return
    try {
        setIsLoadingApprove(true);
        if (selectedPayment) {
        const {amount,asset,assetMetadata,chainMetadata,contractInteraction,recipient} = selectedPayment;
        if(!contractInteraction && recipient){
          console.log('Direct payment', params)
          const address = SettingsStore.state.eip155Address;
          console.log('address', address)
          const wallet = eip155Wallets[address];
          const {chainId} = chainMetadata;
          if(wallet instanceof EIP155Lib){
            console.log({chainId})
            const provider = new providers.JsonRpcProvider(EIP155_CHAINS[`eip155:${chainId}` as TEIP155Chain].rpc)
            const connectedWallet = wallet.connect(provider)
            const txHash = await WalletCheckoutPaymentHandler.handleDirectPayment(connectedWallet, selectedPayment)
            console.log('txHash', txHash)
            styledToast('Payment approved successfully', 'success');
            await walletkit.respondSessionRequest({
              topic,
              response: formatJsonRpcResult<CheckoutResult>(requestEvent.id, {
                orderId: checkoutRequest.orderId,
                txid: txHash,
                amount: amount,
                asset: asset,
                recipient: recipient,
              })
            })
            ModalStore.close();
          }
        }
        if(contractInteraction && !recipient){
          console.log(`Contract interaction`)
          const address = SettingsStore.state.eip155Address;
          console.log('address', address)
          const wallet = eip155Wallets[address];
          const {chainId} = chainMetadata;
          if(wallet instanceof EIP155Lib){
            console.log({chainId})
            const provider = new providers.JsonRpcProvider(EIP155_CHAINS[`eip155:${chainId}` as TEIP155Chain].rpc)
            const connectedWallet = wallet.connect(provider)
            const txHash = await WalletCheckoutPaymentHandler.handleContractPayment(connectedWallet, selectedPayment)
            console.log('txHash', txHash)
            styledToast('Payment approved successfully', 'success');
            await walletkit.respondSessionRequest({
              topic,
              response: formatJsonRpcResult<CheckoutResult>(requestEvent.id, {
                orderId: checkoutRequest.orderId,
                txid: txHash,
                amount: amount,
                asset: asset,
              })
            })
            ModalStore.close();
          }
        }
      }
    } catch (e) {
      ModalStore.close();
      await walletkit.respondSessionRequest({
        topic,
        response: formatJsonRpcError(requestEvent?.id, (e as Error).message)
      })
      setIsLoadingApprove(false);
      styledToast((e as Error).message, 'error');

    } finally {
      setIsLoadingApprove(false);
    }
   
  }, [checkoutRequest.orderId, params, requestEvent, selectedPayment, topic]);

  const onSelectPayment = useCallback((payment: DetailedPaymentOption) => {
    setSelectedPayment(payment);
  }, []);

  useEffect(() => {
    const fetchCheckoutRequest = async () => {
      if (request && requestSession) {
        const address = SettingsStore.state.eip155Address;
        const {feasiblePayments} = await WalletCheckoutUtil.prepareCheckoutRequest(address, request.params[0]);
        setFeasiblePayments(feasiblePayments);
        setIsReadyToRender(true);
      }
    };
    fetchCheckoutRequest();
  }, [request, requestSession]);

  if(!isReadyToRender){
    return<LoadingModal />
  }
  

  return isReadyToRender ? (
    <Fragment>
      <Modal.Header>
        <Text h3>Checkout</Text>
      </Modal.Header>
      
      <Modal.Body css={modalStyles.modalBody}>
        <Container css={{ padding: 0 }}>
          {/* Products */}
          <ProductsSection products={checkoutRequest.products} />
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
             {isLoadingApprove ? (
            <Loading size="md" type="points"/>
          ) : (
            'Pay'
          )}
          </Button>
        </Row>
      </Container>

    </Fragment>
  ) : (
    <Text>Missing request data</Text>
  );
}