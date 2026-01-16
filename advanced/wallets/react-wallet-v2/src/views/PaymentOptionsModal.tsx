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
import VerifiedIcon from '@mui/icons-material/Verified'
import ErrorIcon from '@mui/icons-material/Error'
import PaymentIcon from '@mui/icons-material/Payment'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PersonIcon from '@mui/icons-material/Person'
import CloseIcon from '@mui/icons-material/Close'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import ModalStore from '@/store/ModalStore'
import PayStore from '@/store/PayStore'
import SettingsStore from '@/store/SettingsStore'
import { eip155Wallets } from '@/utils/EIP155WalletUtil'
import { styledToast } from '@/utils/HelperUtil'
import type { PaymentOptionsResponse, PaymentOption, CollectDataFieldResult } from '@walletconnect/pay'

type PaymentState = 'loading' | 'intro' | 'error' | 'collect_data' | 'options' | 'confirming' | 'success'

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

// Intro screen styled components
const IntroContainer = styled('div', {
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center'
})

const IntroCloseButton = styled('button', {
  position: 'absolute',
  top: '16px',
  right: '16px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '8px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.2s',
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.05)'
  }
})

const IntroMerchantLogo = styled('div', {
  width: '64px',
  height: '64px',
  borderRadius: '16px',
  backgroundColor: '#000',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  marginBottom: '16px',
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  }
})

const IntroTitle = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  marginBottom: '32px',
  textAlign: 'center',
  width: '100%'
})

const IntroTimeline = styled('div', {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '0',
  marginBottom: '32px'
})

const IntroTimelineStep = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  position: 'relative'
})

const IntroTimelineIndicator = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  width: '12px',
  alignSelf: 'stretch'
})

const IntroTimelineCircle = styled('div', {
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  border: '2px solid #E5E5E5',
  backgroundColor: 'white',
  zIndex: 1,
  flexShrink: 0
})

const IntroTimelineLine = styled('div', {
  position: 'absolute',
  width: '2px',
  top: '50%',
  bottom: '-12px',
  left: '50%',
  transform: 'translateX(-50%)',
  backgroundColor: '#E5E5E5'
})

const IntroTimelineContent = styled('div', {
  flex: 1,
  paddingBottom: '24px'
})

const IntroTimelineHeader = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '0'
})

const IntroTimelineBadge = styled('span', {
  fontSize: '12px',
  color: '#888',
  backgroundColor: 'rgba(128, 128, 128, 0.15)',
  padding: '4px 8px',
  borderRadius: '4px'
})

const IntroStartButton = styled('button', {
  width: '100%',
  padding: '16px',
  backgroundColor: '#0094FF',
  color: 'white',
  border: 'none',
  borderRadius: '16px',
  fontSize: '16px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  '&:hover': {
    backgroundColor: '#0080E0'
  }
})

// Form screen styled components
const FormContainer = styled('div', {
  padding: '0 24px 24px 24px',
  display: 'flex',
  flexDirection: 'column'
})

const FormHeader = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 16px 8px 16px'
})

const FormHeaderButton = styled('button', {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '8px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.2s',
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.05)'
  }
})

const FormProgressDots = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
})

const FormProgressDot = styled('div', {
  height: '4px',
  borderRadius: '2px',
  transition: 'all 0.2s',
  variants: {
    active: {
      true: {
        width: '24px',
        backgroundColor: '#0094FF'
      },
      false: {
        width: '24px',
        backgroundColor: '#E5E5E5'
      }
    }
  },
  defaultVariants: {
    active: false
  }
})

const FormTitle = styled('h2', {
  fontSize: '20px',
  fontWeight: '600',
  textAlign: 'center',
  margin: '16px 0 24px 0',
  color: '$text'
})

const FormInputWrapper = styled('div', {
  marginBottom: '12px'
})

const FormInput = styled('input', {
  width: '100%',
  padding: '16px',
  fontSize: '16px',
  border: '2px solid #E5E5E5',
  borderRadius: '12px',
  outline: 'none',
  transition: 'border-color 0.2s',
  backgroundColor: 'transparent',
  color: '$text',
  boxSizing: 'border-box',
  '&:focus': {
    borderColor: '#0094FF'
  },
  '&::placeholder': {
    color: '#999'
  },
  variants: {
    hasError: {
      true: {
        borderColor: '#F31260'
      }
    }
  }
})

const FormInputError = styled('span', {
  fontSize: '12px',
  color: '#F31260',
  marginTop: '4px',
  display: 'block'
})

const FormContinueButton = styled('button', {
  width: '100%',
  padding: '16px',
  backgroundColor: '#0094FF',
  color: 'white',
  border: 'none',
  borderRadius: '16px',
  fontSize: '16px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  marginTop: '12px',
  '&:hover': {
    backgroundColor: '#0080E0'
  },
  '&:disabled': {
    backgroundColor: '#ccc',
    cursor: 'not-allowed'
  }
})

// Payment info screen styled components
const PaymentInfoContainer = styled('div', {
  padding: '0 24px 24px 24px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center'
})

const PaymentInfoMerchantLogo = styled('div', {
  width: '72px',
  height: '72px',
  borderRadius: '20px',
  backgroundColor: '#000',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  marginBottom: '16px',
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  }
})

const PaymentInfoTitle = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  marginBottom: '24px',
  textAlign: 'center',
  width: '100%'
})

const PaymentInfoRow = styled('div', {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px',
  borderRadius: '12px',
  border: '1px solid #E5E5E5',
  marginBottom: '12px'
})

const PaymentInfoLabel = styled('span', {
  fontSize: '16px',
  color: '#666'
})

const PaymentInfoValue = styled('span', {
  fontSize: '16px',
  fontWeight: '600',
  color: '$text'
})

const PaymentMethodSelector = styled('button', {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '0'
})

const PaymentMethodIcon = styled('img', {
  width: '24px',
  height: '24px',
  borderRadius: '50%'
})

const PaymentMethodDropdown = styled('div', {
  position: 'absolute',
  top: '100%',
  right: '0',
  marginTop: '8px',
  backgroundColor: '#2a2a2a',
  borderRadius: '12px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  zIndex: 100,
  minWidth: '200px',
  maxHeight: '300px',
  overflowY: 'auto'
})

const PaymentMethodOption = styled('button', {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 16px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  },
  '&:first-child': {
    borderTopLeftRadius: '12px',
    borderTopRightRadius: '12px'
  },
  '&:last-child': {
    borderBottomLeftRadius: '12px',
    borderBottomRightRadius: '12px'
  }
})

const PayButton = styled('button', {
  width: '100%',
  padding: '16px',
  backgroundColor: '#0094FF',
  color: 'white',
  border: 'none',
  borderRadius: '16px',
  fontSize: '16px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  marginTop: '12px',
  '&:hover': {
    backgroundColor: '#0080E0'
  },
  '&:disabled': {
    backgroundColor: '#ccc',
    cursor: 'not-allowed'
  }
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

// Group fields into form steps with titles
interface FormStepConfig {
  title: string
  fields: Array<{ id: string; name: string; fieldType: string; required?: boolean }>
}

function groupFieldsIntoSteps(fields: Array<{ id: string; name: string; fieldType: string; required?: boolean }>): FormStepConfig[] {
  const steps: FormStepConfig[] = []

  // Group name fields together
  const nameFields = fields.filter(f =>
    f.id.toLowerCase().includes('name') ||
    f.name.toLowerCase().includes('name')
  )
  if (nameFields.length > 0) {
    steps.push({ title: "What's your name?", fields: nameFields })
  }

  // Date of birth as separate step
  const dobFields = fields.filter(f =>
    f.fieldType === 'date' ||
    f.id.toLowerCase().includes('birth') ||
    f.id.toLowerCase().includes('dob') ||
    f.name.toLowerCase().includes('birth') ||
    f.name.toLowerCase().includes('date')
  )
  if (dobFields.length > 0) {
    steps.push({ title: "What's your date of birth?", fields: dobFields })
  }

  // Any remaining fields
  const usedIds = new Set([...nameFields.map(f => f.id), ...dobFields.map(f => f.id)])
  const otherFields = fields.filter(f => !usedIds.has(f.id))
  if (otherFields.length > 0) {
    steps.push({ title: 'Additional information', fields: otherFields })
  }

  return steps
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
  const [formStep, setFormStep] = useState(0)
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false)

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

        // Show intro screen first
        setState('intro')
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

  // Get form steps from fields
  const formSteps = paymentData?.collectData?.fields
    ? groupFieldsIntoSteps(paymentData.collectData.fields)
    : []

  const validateCurrentStep = useCallback((): boolean => {
    if (formSteps.length === 0) return true

    const currentStepConfig = formSteps[formStep]
    if (!currentStepConfig) return true

    const errors: Record<string, string> = {}

    for (const field of currentStepConfig.fields) {
      const value = formData[field.id]?.trim() || ''

      if (field.required && !value) {
        errors[field.id] = `${field.name} is required`
      } else if (value && field.fieldType === 'date' && !isValidDate(value)) {
        errors[field.id] = 'Please enter a valid date (YYYY-MM-DD)'
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }, [formSteps, formStep, formData])

  const handleFormContinue = useCallback(() => {
    if (!validateCurrentStep()) return

    // If there are more steps, go to next step
    if (formStep < formSteps.length - 1) {
      setFormStep(prev => prev + 1)
      setFormErrors({})
    } else {
      // Last step - submit form
      const results: CollectDataFieldResult[] = Object.entries(formData)
        .filter(([_, value]) => value.trim())
        .map(([id, value]) => ({ id, value: value.trim() }))

      setCollectedData(results)
      setState('options')
    }
  }, [validateCurrentStep, formStep, formSteps.length, formData])

  const handleFormStepBack = useCallback(() => {
    if (formStep > 0) {
      setFormStep(prev => prev - 1)
      setFormErrors({})
    } else {
      // First step - go back to intro
      setState('intro')
    }
  }, [formStep])

  const handleBackToCollectData = useCallback(() => {
    setState('collect_data')
  }, [])

  const handleBackToIntro = useCallback(() => {
    setFormStep(0)
    setState('intro')
  }, [])

  const handleStartFromIntro = useCallback(() => {
    // Check if collectData is required
    if (paymentData?.collectData && paymentData.collectData.fields && paymentData.collectData.fields.length > 0) {
      setState('collect_data')
    } else {
      setState('options')
    }
  }, [paymentData])

  const handleSelectOption = useCallback((option: PaymentOption) => {
    setSelectedOption(option)
    setShowPaymentDropdown(false)
  }, [])

  const handleBackFromOptions = useCallback(() => {
    const hasCollectData = paymentData?.collectData && paymentData.collectData.fields && paymentData.collectData.fields.length > 0
    if (hasCollectData) {
      // Go back to last form step
      setFormStep(formSteps.length - 1)
      setState('collect_data')
    } else {
      setState('intro')
    }
  }, [paymentData, formSteps.length])

  // Auto-select first payment option when entering options state
  useEffect(() => {
    if (state === 'options' && paymentData?.options && paymentData.options.length > 0 && !selectedOption) {
      setSelectedOption(paymentData.options[0])
    }
  }, [state, paymentData?.options, selectedOption])

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

  // Intro State
  if (state === 'intro') {
    const merchantInfo = paymentData?.info?.merchant
    const paymentAmount = paymentData?.info?.amount
    const hasCollectData = paymentData?.collectData && paymentData.collectData.fields && paymentData.collectData.fields.length > 0

    // Format the payment amount for display
    const formattedAmount = paymentAmount
      ? `$${formatAmount(paymentAmount.value, paymentAmount.display?.decimals || 2)}`
      : ''

    return (
      <Fragment>
        <Modal.Body css={{ position: 'relative', padding: '0' }}>
          <IntroCloseButton onClick={handleClose}>
            <CloseIcon sx={{ fontSize: 24, color: '#666' }} />
          </IntroCloseButton>

          <IntroContainer>
            <IntroMerchantLogo>
              {merchantInfo?.iconUrl ? (
                <img src={merchantInfo.iconUrl} alt={merchantInfo.name || 'Merchant'} />
              ) : (
                <Text b css={{ color: 'white', fontSize: '24px' }}>
                  {merchantInfo?.name?.charAt(0) || 'M'}
                </Text>
              )}
            </IntroMerchantLogo>

            <IntroTitle>
              <Text h4 css={{ margin: 0, fontWeight: '600' }}>
                Pay {formattedAmount} to {merchantInfo?.name || 'Merchant'}
              </Text>
              <VerifiedIcon sx={{ fontSize: 20, color: '#0094FF' }} />
            </IntroTitle>

            <IntroTimeline>
              {/* Step 1: Provide information */}
              {hasCollectData && (
                <IntroTimelineStep>
                  <IntroTimelineIndicator>
                    <IntroTimelineCircle />
                    <IntroTimelineLine />
                  </IntroTimelineIndicator>
                  <IntroTimelineContent>
                    <IntroTimelineHeader>
                      <Text b css={{ fontSize: '16px', margin: 0 }}>
                        Provide information
                      </Text>
                      <IntroTimelineBadge>≈2min</IntroTimelineBadge>
                    </IntroTimelineHeader>
                    <Text css={{ fontSize: '14px', color: '#666', margin: 0 }}>
                      A quick one-time check required for regulated payments.
                    </Text>
                  </IntroTimelineContent>
                </IntroTimelineStep>
              )}

              {/* Step 2: Confirm payment */}
              <IntroTimelineStep>
                <IntroTimelineIndicator>
                  <IntroTimelineCircle />
                </IntroTimelineIndicator>
                <IntroTimelineContent css={{ paddingBottom: 0 }}>
                  <IntroTimelineHeader>
                    <Text b css={{ fontSize: '16px', margin: 0 }}>
                      Confirm payment
                    </Text>
                  </IntroTimelineHeader>
                  <Text css={{ fontSize: '14px', color: '#666', margin: 0 }}>
                    Review the details and approve the payment.
                  </Text>
                </IntroTimelineContent>
              </IntroTimelineStep>
            </IntroTimeline>

            <IntroStartButton onClick={handleStartFromIntro}>
              Let&apos;s start
            </IntroStartButton>
          </IntroContainer>
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
    const currentStepConfig = formSteps[formStep]
    const totalProgressDots = Math.max(formSteps.length, 4) // At least 4 dots as shown in design

    return (
      <Fragment>
        <Modal.Body css={{ padding: 0 }}>
          <FormHeader>
            <FormHeaderButton onClick={handleFormStepBack}>
              <ArrowBackIcon sx={{ fontSize: 24, color: '#666' }} />
            </FormHeaderButton>
            <FormProgressDots>
              {Array.from({ length: totalProgressDots }).map((_, index) => (
                <FormProgressDot key={index} active={index <= formStep} />
              ))}
            </FormProgressDots>
            <FormHeaderButton onClick={handleClose}>
              <CloseIcon sx={{ fontSize: 24, color: '#666' }} />
            </FormHeaderButton>
          </FormHeader>

          <FormContainer>
            <FormTitle>{currentStepConfig?.title || 'Additional information'}</FormTitle>

            {/* Form Fields for current step */}
            {currentStepConfig?.fields.map(field => (
              <FormInputWrapper key={field.id}>
                <FormInput
                  placeholder={field.name}
                  value={formData[field.id] || ''}
                  onChange={e => handleFormChange(field.id, e.target.value, field.fieldType)}
                  maxLength={field.fieldType === 'date' ? 10 : undefined}
                  hasError={!!formErrors[field.id]}
                />
                {formErrors[field.id] && (
                  <FormInputError>{formErrors[field.id]}</FormInputError>
                )}
              </FormInputWrapper>
            ))}

            <FormContinueButton onClick={handleFormContinue}>
              Continue
            </FormContinueButton>
          </FormContainer>
        </Modal.Body>
      </Fragment>
    )
  }

  // Options State
  const merchantInfo = paymentData?.info?.merchant
  const paymentAmount = paymentData?.info?.amount
  const totalProgressDots = Math.max(formSteps.length, 4)

  // Format the payment amount for display
  const formattedPaymentAmount = paymentAmount
    ? `$${formatAmount(paymentAmount.value, paymentAmount.display?.decimals || 2)}`
    : ''

  return (
    <Fragment>
      <Modal.Body css={{ padding: 0 }}>
        <FormHeader>
          <FormHeaderButton onClick={handleBackFromOptions}>
            <ArrowBackIcon sx={{ fontSize: 24, color: '#666' }} />
          </FormHeaderButton>
          <FormProgressDots>
            {Array.from({ length: totalProgressDots }).map((_, index) => (
              <FormProgressDot key={index} active={true} />
            ))}
          </FormProgressDots>
          <FormHeaderButton onClick={handleClose}>
            <CloseIcon sx={{ fontSize: 24, color: '#666' }} />
          </FormHeaderButton>
        </FormHeader>

        <PaymentInfoContainer>
          <PaymentInfoMerchantLogo>
            {merchantInfo?.iconUrl ? (
              <img src={merchantInfo.iconUrl} alt={merchantInfo.name || 'Merchant'} />
            ) : (
              <Text b css={{ color: 'white', fontSize: '28px' }}>
                {merchantInfo?.name?.charAt(0) || 'M'}
              </Text>
            )}
          </PaymentInfoMerchantLogo>

          <PaymentInfoTitle>
            <Text h4 css={{ margin: 0, fontWeight: '600' }}>
              Pay {formattedPaymentAmount} to {merchantInfo?.name || 'Merchant'}
            </Text>
            <VerifiedIcon sx={{ fontSize: 20, color: '#0094FF' }} />
          </PaymentInfoTitle>

          {/* Amount Row */}
          <PaymentInfoRow>
            <PaymentInfoLabel>Amount</PaymentInfoLabel>
            <PaymentInfoValue>{formattedPaymentAmount}</PaymentInfoValue>
          </PaymentInfoRow>

          {/* Pay With Row */}
          <PaymentInfoRow css={{ position: 'relative' }}>
            <PaymentInfoLabel>Pay with</PaymentInfoLabel>
            <PaymentMethodSelector onClick={() => setShowPaymentDropdown(!showPaymentDropdown)}>
              <PaymentInfoValue>
                {selectedOption
                  ? `${formatAmount(selectedOption.amount.value, selectedOption.amount.display?.decimals || 18)} ${selectedOption.amount.display?.assetSymbol || ''}`
                  : 'Select'}
              </PaymentInfoValue>
              {selectedOption?.amount.display?.iconUrl && (
                <PaymentMethodIcon
                  src={selectedOption.amount.display.iconUrl}
                  alt={selectedOption.amount.display.assetSymbol}
                />
              )}
              <KeyboardArrowDownIcon sx={{ fontSize: 20, color: '#666' }} />
            </PaymentMethodSelector>

            {/* Payment Method Dropdown */}
            {showPaymentDropdown && paymentData?.options && paymentData.options.length > 0 && (
              <PaymentMethodDropdown>
                {paymentData.options.map(option => (
                  <PaymentMethodOption
                    key={option.id}
                    onClick={() => handleSelectOption(option)}
                  >
                    {option.amount.display?.iconUrl ? (
                      <PaymentMethodIcon
                        src={option.amount.display.iconUrl}
                        alt={option.amount.display.assetSymbol}
                      />
                    ) : (
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Text css={{ color: 'white', fontSize: '12px' }}>
                          {option.amount.display?.assetSymbol?.charAt(0) || '?'}
                        </Text>
                      </div>
                    )}
                    <Text css={{ flex: 1, textAlign: 'left', color: '#fff' }}>
                      {formatAmount(option.amount.value, option.amount.display?.decimals || 18)}{' '}
                      {option.amount.display?.assetSymbol || 'Token'}
                    </Text>
                    {selectedOption?.id === option.id && (
                      <CheckCircleIcon sx={{ fontSize: 18, color: '#17C964' }} />
                    )}
                  </PaymentMethodOption>
                ))}
              </PaymentMethodDropdown>
            )}
          </PaymentInfoRow>

          <PayButton onClick={handleConfirm} disabled={!selectedOption || isProcessing}>
            {isProcessing ? 'Processing...' : `Pay ${formattedPaymentAmount}`}
          </PayButton>
        </PaymentInfoContainer>
      </Modal.Body>
    </Fragment>
  )
}
