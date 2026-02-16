import { useCallback, useState, useEffect } from 'react'
import ModalStore from '@/store/ModalStore'
import PayStore from '@/store/PayStore'
import SettingsStore from '@/store/SettingsStore'
import { eip155Wallets } from '@/utils/EIP155WalletUtil'
import { styledToast } from '@/utils/HelperUtil'
import type { PaymentOptionsResponse, PaymentOption, CollectDataFieldResult } from '@walletconnect/pay'
import {
  LoadingState,
  ErrorState,
  SuccessState,
  ConfirmingState,
  IntroScreen,
  CollectDataForm,
  PaymentInfoScreen,
  groupFieldsIntoSteps,
  PaymentState
} from '@/components/PaymentModal'

export default function PaymentOptionsModal() {
  const [state, setState] = useState<PaymentState>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [paymentData, setPaymentData] = useState<PaymentOptionsResponse | null>(null)
  const [selectedOption, setSelectedOption] = useState<PaymentOption | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const [formData, setFormData] = useState<Record<string, string>>({})
  const [collectedData, setCollectedData] = useState<CollectDataFieldResult[]>([])

  const paymentLink = ModalStore.state.data?.paymentLink as string | undefined

  const formSteps = paymentData?.collectData?.fields
    ? groupFieldsIntoSteps(paymentData.collectData.fields)
    : []

  const hasCollectData =
    paymentData?.collectData &&
    paymentData.collectData.fields &&
    paymentData.collectData.fields.length > 0

  useEffect(() => {
    async function fetchOptions() {
      if (!paymentLink) {
        setErrorMessage('No payment link provided')
        setState('error')
        return
      }

      const payClient = PayStore.getClient()
      if (!payClient) {
        setErrorMessage('Pay SDK not initialized. Please check your API key configuration.')
        setState('error')
        return
      }

      try {
        const eip155Address = SettingsStore.state.eip155Address
        // Support multiple chains: Base (8453), Optimism (10), Arbitrum (42161), Ethereum (1)
        const supportedChainIds = [8453, 10, 42161, 1]
        const accounts = eip155Address
          ? supportedChainIds.map(chainId => `eip155:${chainId}:${eip155Address}`)
          : []

        const options = await payClient.getPaymentOptions({
          paymentLink,
          accounts,
          includePaymentInfo: true
        })

        setPaymentData(options)
        setState('intro')
      } catch (error: any) {
        console.error('[PaymentOptionsModal] Failed to fetch options:', error)
        setErrorMessage(error?.message || 'Failed to fetch payment options')
        setState('error')
      }
    }

    fetchOptions()
  }, [paymentLink])

  useEffect(() => {
    if (state === 'options' && paymentData?.options && paymentData.options.length > 0 && !selectedOption) {
      setSelectedOption(paymentData.options[0])
    }
  }, [state, paymentData?.options, selectedOption])

  const handleClose = useCallback(() => {
    ModalStore.close()
  }, [])

  const handleStartFromIntro = useCallback(() => {
    if (hasCollectData) {
      setState('collect_data')
    } else {
      setState('options')
    }
  }, [hasCollectData])

  const handleFormChange = useCallback((fieldId: string, value: string, _fieldType: string) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }))
  }, [])

  const handleFormComplete = useCallback((results: CollectDataFieldResult[]) => {
    setCollectedData(results)
    setState('options')
  }, [])

  const handleBackFromForm = useCallback(() => {
    setState('intro')
  }, [])

  const handleSelectOption = useCallback((option: PaymentOption) => {
    setSelectedOption(option)
  }, [])

  const handleBackFromOptions = useCallback(() => {
    if (hasCollectData) {
      setState('collect_data')
    } else {
      setState('intro')
    }
  }, [hasCollectData])

  const handleConfirm = useCallback(async () => {
    if (!selectedOption || !paymentData) return

    const payClient = PayStore.getClient()
    if (!payClient) {
      styledToast('Pay SDK not available', 'error')
      return
    }

    setIsProcessing(true)
    setState('confirming')

    try {
      // Must call getRequiredPaymentActions to establish server-side state before confirming
      const actions = await payClient.getRequiredPaymentActions({
        paymentId: paymentData.paymentId,
        optionId: selectedOption.id
      })

      const signatures: string[] = []
      const eip155Address = SettingsStore.state.eip155Address
      const wallet = eip155Wallets[eip155Address]

      if (!wallet) {
        throw new Error('Wallet not available')
      }

      for (const action of actions) {
        if (!action.walletRpc) continue

        const { method, params } = action.walletRpc
        const parsedParams = JSON.parse(params)

        if (method === 'eth_signTypedData_v4') {
          const typedData = JSON.parse(parsedParams[1])
          const { domain, types, message } = typedData
          delete types.EIP712Domain
          const signature = await wallet._signTypedData(domain, types, message)
          signatures.push(signature)
        }
      }

      const result = await payClient.confirmPayment({
        paymentId: paymentData.paymentId,
        optionId: selectedOption.id,
        signatures,
        collectedData: collectedData.length > 0 ? collectedData : undefined
      })

      if (result.status === 'succeeded' || result.isFinal) {
        setState('success')
        styledToast('Payment successful!', 'success')
      } else if (result.status === 'processing') {
        setState('success')
        styledToast('Payment is processing...', 'success')
      } else {
        throw new Error(`Payment failed with status: ${result.status}`)
      }
    } catch (error: any) {
      console.error('[PaymentOptionsModal] Payment failed:', error)
      setErrorMessage(error?.message || 'Payment failed')
      setState('error')
      styledToast(error?.message || 'Payment failed', 'error')
    } finally {
      setIsProcessing(false)
    }
  }, [selectedOption, paymentData, collectedData])

  if (state === 'loading') {
    return <LoadingState />
  }

  if (state === 'error') {
    return <ErrorState errorMessage={errorMessage} onClose={handleClose} />
  }

  if (state === 'success') {
    return <SuccessState onClose={handleClose} />
  }

  if (state === 'confirming') {
    return <ConfirmingState />
  }

  if (state === 'intro') {
    return (
      <IntroScreen
        merchantName={paymentData?.info?.merchant?.name}
        merchantIconUrl={paymentData?.info?.merchant?.iconUrl}
        paymentAmount={paymentData?.info?.amount}
        hasCollectData={!!hasCollectData}
        onStart={handleStartFromIntro}
        onClose={handleClose}
      />
    )
  }

  if (state === 'collect_data') {
    return (
      <CollectDataForm
        formSteps={formSteps}
        formStep={0}
        formData={formData}
        onFormChange={handleFormChange}
        onContinue={handleFormComplete}
        onBack={handleBackFromForm}
        onClose={handleClose}
      />
    )
  }

  const totalProgressDots = Math.max(formSteps.length, 4)

  return (
    <PaymentInfoScreen
      merchantName={paymentData?.info?.merchant?.name}
      merchantIconUrl={paymentData?.info?.merchant?.iconUrl}
      paymentAmount={paymentData?.info?.amount}
      options={paymentData?.options || []}
      selectedOption={selectedOption}
      totalProgressDots={totalProgressDots}
      isProcessing={isProcessing}
      onSelectOption={handleSelectOption}
      onConfirm={handleConfirm}
      onBack={handleBackFromOptions}
      onClose={handleClose}
    />
  )
}
