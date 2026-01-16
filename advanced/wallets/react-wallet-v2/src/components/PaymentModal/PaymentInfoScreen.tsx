import { Modal, Text } from '@nextui-org/react'
import { Fragment, useState } from 'react'
import VerifiedIcon from '@mui/icons-material/Verified'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CloseIcon from '@mui/icons-material/Close'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import type { PaymentOption } from '@walletconnect/pay'
import {
  FormHeader,
  FormHeaderButton,
  FormProgressDot,
  FormProgressDots,
  PayButton,
  PaymentInfoContainer,
  PaymentInfoLabel,
  PaymentInfoMerchantLogo,
  PaymentInfoRow,
  PaymentInfoTitle,
  PaymentInfoValue,
  PaymentMethodDropdown,
  PaymentMethodIcon,
  PaymentMethodOption,
  PaymentMethodSelector
} from './styles'
import { formatAmount } from './utils'

interface PaymentInfoScreenProps {
  merchantName?: string
  merchantIconUrl?: string
  paymentAmount?: {
    value: string
    display?: {
      decimals?: number
    }
  }
  options: PaymentOption[]
  selectedOption: PaymentOption | null
  totalProgressDots: number
  isProcessing: boolean
  onSelectOption: (option: PaymentOption) => void
  onConfirm: () => void
  onBack: () => void
  onClose: () => void
}

export default function PaymentInfoScreen({
  merchantName,
  merchantIconUrl,
  paymentAmount,
  options,
  selectedOption,
  totalProgressDots,
  isProcessing,
  onSelectOption,
  onConfirm,
  onBack,
  onClose
}: PaymentInfoScreenProps) {
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false)

  const formattedPaymentAmount = paymentAmount
    ? `$${formatAmount(paymentAmount.value, paymentAmount.display?.decimals || 2)}`
    : ''

  const handleSelectOption = (option: PaymentOption) => {
    onSelectOption(option)
    setShowPaymentDropdown(false)
  }

  return (
    <Fragment>
      <Modal.Body css={{ padding: 0 }}>
        <FormHeader>
          <FormHeaderButton onClick={onBack}>
            <ArrowBackIcon sx={{ fontSize: 24, color: '#666' }} />
          </FormHeaderButton>
          <FormProgressDots>
            {Array.from({ length: totalProgressDots }).map((_, index) => (
              <FormProgressDot key={index} active={true} />
            ))}
          </FormProgressDots>
          <FormHeaderButton onClick={onClose}>
            <CloseIcon sx={{ fontSize: 24, color: '#666' }} />
          </FormHeaderButton>
        </FormHeader>

        <PaymentInfoContainer>
          <PaymentInfoMerchantLogo>
            {merchantIconUrl ? (
              <img src={merchantIconUrl} alt={merchantName || 'Merchant'} />
            ) : (
              <Text b css={{ color: 'white', fontSize: '28px' }}>
                {merchantName?.charAt(0) || 'M'}
              </Text>
            )}
          </PaymentInfoMerchantLogo>

          <PaymentInfoTitle>
            <Text h4 css={{ margin: 0, fontWeight: '600' }}>
              Pay {formattedPaymentAmount} to {merchantName || 'Merchant'}
            </Text>
            <VerifiedIcon sx={{ fontSize: 20, color: '#0094FF' }} />
          </PaymentInfoTitle>

          <PaymentInfoRow>
            <PaymentInfoLabel>Amount</PaymentInfoLabel>
            <PaymentInfoValue>{formattedPaymentAmount}</PaymentInfoValue>
          </PaymentInfoRow>

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

            {showPaymentDropdown && options.length > 0 && (
              <PaymentMethodDropdown>
                {options.map(option => (
                  <PaymentMethodOption key={option.id} onClick={() => handleSelectOption(option)}>
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

          <PayButton onClick={onConfirm} disabled={!selectedOption || isProcessing}>
            {isProcessing ? 'Processing...' : `Pay ${formattedPaymentAmount}`}
          </PayButton>
        </PaymentInfoContainer>
      </Modal.Body>
    </Fragment>
  )
}
