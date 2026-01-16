import { Modal, Text } from '@nextui-org/react'
import { Fragment } from 'react'
import VerifiedIcon from '@mui/icons-material/Verified'
import CloseIcon from '@mui/icons-material/Close'
import {
  IntroCloseButton,
  IntroContainer,
  IntroMerchantLogo,
  IntroStartButton,
  IntroTimeline,
  IntroTimelineBadge,
  IntroTimelineCircle,
  IntroTimelineContent,
  IntroTimelineHeader,
  IntroTimelineIndicator,
  IntroTimelineLine,
  IntroTimelineStep,
  IntroTitle
} from './styles'
import { formatAmount } from './utils'

interface IntroScreenProps {
  merchantName?: string
  merchantIconUrl?: string
  paymentAmount?: {
    value: string
    display?: {
      decimals?: number
    }
  }
  hasCollectData: boolean
  onStart: () => void
  onClose: () => void
}

export default function IntroScreen({
  merchantName,
  merchantIconUrl,
  paymentAmount,
  hasCollectData,
  onStart,
  onClose
}: IntroScreenProps) {
  const formattedAmount = paymentAmount
    ? `$${formatAmount(paymentAmount.value, paymentAmount.display?.decimals || 2)}`
    : ''

  return (
    <Fragment>
      <Modal.Body css={{ position: 'relative', padding: '0' }}>
        <IntroCloseButton onClick={onClose}>
          <CloseIcon sx={{ fontSize: 24, color: '#666' }} />
        </IntroCloseButton>

        <IntroContainer>
          <IntroMerchantLogo>
            {merchantIconUrl ? (
              <img src={merchantIconUrl} alt={merchantName || 'Merchant'} />
            ) : (
              <Text b css={{ color: 'white', fontSize: '24px' }}>
                {merchantName?.charAt(0) || 'M'}
              </Text>
            )}
          </IntroMerchantLogo>

          <IntroTitle>
            <Text h4 css={{ margin: 0, fontWeight: '600' }}>
              Pay {formattedAmount} to {merchantName || 'Merchant'}
            </Text>
            <VerifiedIcon sx={{ fontSize: 20, color: '#0094FF' }} />
          </IntroTitle>

          <IntroTimeline>
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

          <IntroStartButton onClick={onStart}>Let&apos;s start</IntroStartButton>
        </IntroContainer>
      </Modal.Body>
    </Fragment>
  )
}
