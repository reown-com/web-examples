import {
  Avatar,
  Button,
  Col,
  Container,
  Divider,
  Input,
  Loading,
  Modal,
  Row,
  Text,
  styled
} from '@nextui-org/react'
import { Fragment, useCallback, useState, useEffect } from 'react'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import PaymentIcon from '@mui/icons-material/Payment'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PersonIcon from '@mui/icons-material/Person'
import ModalStore from '@/store/ModalStore'
import PayStore from '@/store/PayStore'
import SettingsStore from '@/store/SettingsStore'
import { eip155Wallets } from '@/utils/EIP155WalletUtil'
import { styledToast } from '@/utils/HelperUtil'
import type { PaymentOptionsResponse, PaymentOption, CollectDataFieldResult } from '@walletconnect/pay'

type PaymentState = 'loading' | 'error' | 'collect_data' | 'options' | 'confirming' | 'success'

const StyledOptionCard = styled('div', {
  padding: '16px',
  borderRadius: '12px',
  border: '2px solid transparent',
  backgroundColor: 'rgba(139, 139, 139, 0.1)',
  cursor: 'pointer',
  marginBottom: '8px',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: 'rgba(139, 139, 139, 0.2)'
  },
  variants: {
    selected: {
      true: {
        borderColor: '$primary',
        backgroundColor: 'rgba(23, 200, 100, 0.1)'
      }
    }
  }
})

const StyledTokenIcon = styled('img', {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  objectFit: 'cover'
})

const StyledMerchantIcon = styled(Avatar, {
  border: '2px solid rgba(139, 139, 139, 0.4)'
})

const StyledFormField = styled('div', {
  marginBottom: '16px'
})

function formatAmount(value: string, decimals: number, maxDecimals = 6): string {
  const num = BigInt(value)
  const divisor = BigInt(10 ** decimals)
  const integerPart = num / divisor
  const fractionalPart = num % divisor

  if (fractionalPart === BigInt(0)) {
    return integerPart.toString()
  }

  let fractionalStr = fractionalPart.toString().padStart(decimals, '0')
  fractionalStr = fractionalStr.replace(/0+$/, '')

  if (fractionalStr.length > maxDecimals) {
    fractionalStr = fractionalStr.substring(0, maxDecimals)
  }

  return `${integerPart}.${fractionalStr}`
}

function formatEta(seconds: number): string {
  if (seconds < 60) return `~${seconds}s`
  const minutes = Math.round(seconds / 60)
  return `~${minutes}m`
}

function formatDateInput(value: string): string {
  const cleaned = value.replace(/[^0-9]/g, '')
  if (cleaned.length <= 4) return cleaned
  if (cleaned.length <= 6) return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`
}

function isValidDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    year >= 1900
  )
}

export default function PaymentOptionsModal() {
  const [state, setState] = useState<PaymentState>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [paymentData, setPaymentData] = useState<PaymentOptionsResponse | null>(null)
  const [selectedOption, setSelectedOption] = useState<PaymentOption | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Collect data form state
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [collectedData, setCollectedData] = useState<CollectDataFieldResult[]>([])

  const paymentLink = ModalStore.state.data?.paymentLink as string | undefined

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
        const accounts = eip155Address ? [`eip155:8453:${eip155Address}`] : []

        const options = await payClient.getPaymentOptions({
          paymentLink,
          accounts,
          includePaymentInfo: true
        })

        setPaymentData(options)

        // Check if collectData is required
        if (options.collectData && options.collectData.fields && options.collectData.fields.length > 0) {
          setState('collect_data')
        } else {
          setState('options')
        }
      } catch (error: any) {
        console.error('[PaymentOptionsModal] Failed to fetch options:', error)
        setErrorMessage(error?.message || 'Failed to fetch payment options')
        setState('error')
      }
    }

    fetchOptions()
  }, [paymentLink])

  const handleFormChange = useCallback((fieldId: string, value: string, fieldType: string) => {
    let formattedValue = value

    // Auto-format date inputs
    if (fieldType === 'date') {
      formattedValue = formatDateInput(value)
    }

    setFormData(prev => ({ ...prev, [fieldId]: formattedValue }))

    // Clear error when user starts typing
    if (formErrors[fieldId]) {
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldId]
        return newErrors
      })
    }
  }, [formErrors])

  const validateForm = useCallback((): boolean => {
    if (!paymentData?.collectData?.fields) return true

    const errors: Record<string, string> = {}

    for (const field of paymentData.collectData.fields) {
      const value = formData[field.id]?.trim() || ''

      if (field.required && !value) {
        errors[field.id] = `${field.name} is required`
      } else if (value && field.fieldType === 'date' && !isValidDate(value)) {
        errors[field.id] = 'Please enter a valid date (YYYY-MM-DD)'
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }, [paymentData, formData])

  const handleCollectDataSubmit = useCallback(() => {
    if (!validateForm()) return

    // Convert form data to CollectDataFieldResult array
    const results: CollectDataFieldResult[] = Object.entries(formData)
      .filter(([_, value]) => value.trim())
      .map(([id, value]) => ({ id, value: value.trim() }))

    setCollectedData(results)
    setState('options')
  }, [formData, validateForm])

  const handleBackToCollectData = useCallback(() => {
    setState('collect_data')
  }, [])

  const handleSelectOption = useCallback((option: PaymentOption) => {
    setSelectedOption(option)
  }, [])

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

  const handleClose = useCallback(() => {
    ModalStore.close()
  }, [])

  // Loading State
  if (state === 'loading') {
    return (
      <Fragment>
        <Modal.Header>
          <Text h3>Payment</Text>
        </Modal.Header>
        <Modal.Body>
          <Container css={{ padding: '40px 20px', textAlign: 'center' }}>
            <Loading size="xl" color="primary" />
            <Text css={{ marginTop: '20px' }} color="$gray700">
              Fetching payment options...
            </Text>
          </Container>
        </Modal.Body>
      </Fragment>
    )
  }

  // Error State
  if (state === 'error') {
    return (
      <Fragment>
        <Modal.Header>
          <Text h3>Payment Error</Text>
        </Modal.Header>
        <Modal.Body>
          <Container css={{ padding: '40px 20px', textAlign: 'center' }}>
            <ErrorIcon sx={{ fontSize: 64, color: '#F31260' }} />
            <Text h4 css={{ marginTop: '16px' }} color="error">
              Something went wrong
            </Text>
            <Text css={{ marginTop: '8px' }} color="$gray700">
              {errorMessage}
            </Text>
          </Container>
        </Modal.Body>
        <Modal.Footer>
          <Button auto flat color="error" onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Fragment>
    )
  }

  // Success State
  if (state === 'success') {
    return (
      <Fragment>
        <Modal.Header>
          <Text h3>Payment Complete</Text>
        </Modal.Header>
        <Modal.Body>
          <Container css={{ padding: '40px 20px', textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 80, color: '#17C964' }} />
            <Text h4 css={{ marginTop: '16px' }} color="success">
              Payment Successful
            </Text>
            <Text css={{ marginTop: '8px' }} color="$gray700">
              Your payment has been processed successfully.
            </Text>
          </Container>
        </Modal.Body>
        <Modal.Footer>
          <Button auto color="success" onClick={handleClose}>
            Done
          </Button>
        </Modal.Footer>
      </Fragment>
    )
  }

  // Confirming State
  if (state === 'confirming') {
    return (
      <Fragment>
        <Modal.Header>
          <Text h3>Processing Payment</Text>
        </Modal.Header>
        <Modal.Body>
          <Container css={{ padding: '40px 20px', textAlign: 'center' }}>
            <Loading size="xl" color="primary" />
            <Text h4 css={{ marginTop: '20px' }}>
              Confirming payment...
            </Text>
            <Text css={{ marginTop: '8px' }} color="$gray700">
              Please sign the transaction when prompted
            </Text>
          </Container>
        </Modal.Body>
      </Fragment>
    )
  }

  // Collect Data State
  if (state === 'collect_data') {
    const merchantInfo = paymentData?.info?.merchant
    const totalAmount = paymentData?.info?.totalAmount
    const fields = paymentData?.collectData?.fields || []

    return (
      <Fragment>
        <Modal.Header>
          <Text h3>
            <PersonIcon sx={{ verticalAlign: 'middle', marginRight: '8px' }} />
            Additional Information
          </Text>
        </Modal.Header>

        <Modal.Body>
          <Container css={{ padding: 0 }}>
            {/* Merchant Info */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <Row justify="center">
                <StyledMerchantIcon
                  src={merchantInfo?.iconUrl || '/icons/default-app-icon.png'}
                  size="xl"
                  color="gradient"
                  bordered
                />
              </Row>
              <Text h4 css={{ marginTop: '12px', marginBottom: '4px' }}>
                {merchantInfo?.name || 'Payment'}
              </Text>
              {totalAmount && (
                <Text h3 css={{ margin: '8px 0' }} color="primary">
                  {totalAmount.display?.assetSymbol}{' '}
                  {formatAmount(totalAmount.value, totalAmount.display?.decimals || 2)}
                </Text>
              )}
            </div>

            <Divider css={{ marginBottom: '16px' }} />

            <Text css={{ marginBottom: '16px' }} color="$gray700">
              Please provide the following information to continue with your payment.
            </Text>

            {/* Form Fields */}
            {fields.map(field => (
              <StyledFormField key={field.id}>
                <Input
                  label={`${field.name}${field.required ? ' *' : ''}`}
                  placeholder={field.fieldType === 'date' ? 'YYYY-MM-DD' : `Enter ${field.name.toLowerCase()}`}
                  value={formData[field.id] || ''}
                  onChange={e => handleFormChange(field.id, e.target.value, field.fieldType)}
                  status={formErrors[field.id] ? 'error' : 'default'}
                  helperText={formErrors[field.id]}
                  helperColor="error"
                  fullWidth
                  bordered
                  type={field.fieldType === 'date' ? 'text' : 'text'}
                  maxLength={field.fieldType === 'date' ? 10 : undefined}
                />
              </StyledFormField>
            ))}
          </Container>
        </Modal.Body>

        <Modal.Footer>
          <Row justify="space-between" css={{ width: '100%', gap: '12px' }}>
            <Button
              auto
              flat
              color="error"
              onClick={handleClose}
              css={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              auto
              color="primary"
              onClick={handleCollectDataSubmit}
              css={{ flex: 1 }}
            >
              Continue
            </Button>
          </Row>
        </Modal.Footer>
      </Fragment>
    )
  }

  // Options State
  const merchantInfo = paymentData?.info?.merchant
  const totalAmount = paymentData?.info?.totalAmount
  const hasCollectData = paymentData?.collectData && paymentData.collectData.fields && paymentData.collectData.fields.length > 0

  return (
    <Fragment>
      <Modal.Header>
        <Text h3>
          <PaymentIcon sx={{ verticalAlign: 'middle', marginRight: '8px' }} />
          Payment Request
        </Text>
      </Modal.Header>

      <Modal.Body>
        <Container css={{ padding: 0 }}>
          {/* Merchant Info */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <Row justify="center">
              <StyledMerchantIcon
                src={merchantInfo?.iconUrl || '/icons/default-app-icon.png'}
                size="xl"
                color="gradient"
                bordered
              />
            </Row>
            <Text h4 css={{ marginTop: '12px', marginBottom: '4px' }}>
              {merchantInfo?.name || 'Payment'}
            </Text>
            {totalAmount && (
              <Text h2 css={{ margin: '8px 0' }} color="primary">
                {totalAmount.display?.assetSymbol}{' '}
                {formatAmount(totalAmount.value, totalAmount.display?.decimals || 2)}
              </Text>
            )}
          </div>

          <Divider css={{ marginBottom: '16px' }} />

          {/* Payment Options */}
          <Text h5 css={{ marginBottom: '12px' }}>
            Select Payment Method
          </Text>

          {paymentData?.options && paymentData.options.length > 0 ? (
            paymentData.options.map(option => (
              <StyledOptionCard
                key={option.id}
                selected={selectedOption?.id === option.id}
                onClick={() => handleSelectOption(option)}
              >
                <Row align="center" justify="space-between">
                  <Row align="center" css={{ gap: '12px', flex: 1 }}>
                    {option.amount.display?.iconUrl ? (
                      <StyledTokenIcon
                        src={option.amount.display.iconUrl}
                        alt={option.amount.display.assetSymbol}
                      />
                    ) : (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Text b css={{ color: 'white', fontSize: '14px' }}>
                          {option.amount.display?.assetSymbol?.charAt(0) || '?'}
                        </Text>
                      </div>
                    )}
                    <Col>
                      <Text b css={{ fontSize: '16px' }}>
                        {option.amount.display?.assetSymbol || 'Token'}
                      </Text>
                      <Text size={12} color="$gray700">
                        {option.amount.display?.networkName || 'Network'}
                      </Text>
                    </Col>
                  </Row>

                  <Col css={{ textAlign: 'right' }}>
                    <Text b css={{ fontSize: '16px' }}>
                      {formatAmount(option.amount.value, option.amount.display?.decimals || 18)}
                    </Text>
                    <Row align="center" justify="flex-end" css={{ gap: '4px' }}>
                      <AccessTimeIcon sx={{ fontSize: 12, color: '#697177' }} />
                      <Text size={12} color="$gray700">
                        {formatEta(option.etaS)}
                      </Text>
                    </Row>
                  </Col>

                  {selectedOption?.id === option.id && (
                    <CheckCircleIcon
                      sx={{ fontSize: 24, color: '#17C964', marginLeft: '12px' }}
                    />
                  )}
                </Row>
              </StyledOptionCard>
            ))
          ) : (
            <Container css={{ padding: '40px 20px', textAlign: 'center' }}>
              <Text color="$gray700">No payment options available</Text>
            </Container>
          )}
        </Container>
      </Modal.Body>

      <Modal.Footer>
        <Row justify="space-between" css={{ width: '100%', gap: '12px' }}>
          {hasCollectData ? (
            <Button
              auto
              flat
              onClick={handleBackToCollectData}
              disabled={isProcessing}
              css={{ flex: 1 }}
            >
              Back
            </Button>
          ) : (
            <Button
              auto
              flat
              color="error"
              onClick={handleClose}
              disabled={isProcessing}
              css={{ flex: 1 }}
            >
              Cancel
            </Button>
          )}
          <Button
            auto
            color="success"
            onClick={handleConfirm}
            disabled={!selectedOption || isProcessing}
            css={{ flex: 1 }}
          >
            {isProcessing ? (
              <Loading size="sm" color="white" type="points" />
            ) : (
              `Pay${selectedOption ? ` ${formatAmount(selectedOption.amount.value, selectedOption.amount.display?.decimals || 18)} ${selectedOption.amount.display?.assetSymbol || ''}` : ''}`
            )}
          </Button>
        </Row>
      </Modal.Footer>
    </Fragment>
  )
}
