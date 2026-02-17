import { useCallback, useEffect, useState } from 'react'
import { Modal, Loading, Text, Container } from '@nextui-org/react'
import { useSnapshot } from 'valtio'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CloseIcon from '@mui/icons-material/Close'
import type { PaymentOption } from '@walletconnect/pay'

import ModalStore from '@/store/ModalStore'
import PaymentStore from '@/store/PaymentStore'
import {
  ConfirmPaymentView,
  CollectDataIframe,
  ResultView,
  detectErrorType,
  getErrorMessage,
} from '@/components/PaymentModal'

export default function PaymentOptionsModal() {
  const snap = useSnapshot(PaymentStore.state)
  const [showInfoExplainer, setShowInfoExplainer] = useState(false)

  const selectedOptionCollectDataUrl = (snap.selectedOption as PaymentOption | null)?.collectData?.url

  useEffect(() => {
    if (snap.step === 'loading') {
      if (snap.errorMessage) {
        const errorType = detectErrorType(snap.errorMessage)
        PaymentStore.setResult({
          status: 'error',
          message: getErrorMessage(errorType, snap.errorMessage),
          errorType,
        })
      } else if (snap.paymentOptions) {
        if (!snap.paymentOptions.options || snap.paymentOptions.options.length === 0) {
          PaymentStore.setResult({
            status: 'error',
            errorType: 'insufficient_funds',
            message: getErrorMessage('insufficient_funds'),
          })
        } else {
          PaymentStore.setStep('confirm')
        }
      }
    }
  }, [snap.step, snap.paymentOptions, snap.errorMessage])

  const handleIframeComplete = useCallback(() => {
    const { selectedOption } = PaymentStore.state
    if (selectedOption) {
      PaymentStore.markCollectDataCompleted(selectedOption.id)
    }
    PaymentStore.setStep('confirm')
  }, [])

  const handleIframeError = useCallback((error: string) => {
    const errorType = detectErrorType(error)
    PaymentStore.setResult({
      status: 'error',
      message: getErrorMessage(errorType, error),
      errorType,
    })
  }, [])

  const onClose = useCallback(() => {
    PaymentStore.reset()
    ModalStore.close()
  }, [])

  const goBack = useCallback(() => {
    const { step } = PaymentStore.state
    switch (step) {
      case 'collectData':
        PaymentStore.setStep('confirm')
        break
      default:
        onClose()
    }
  }, [onClose])

  const onSelectOption = useCallback((option: PaymentOption) => {
    PaymentStore.selectOption(option)
    PaymentStore.fetchPaymentActions(option)
  }, [])

  const handleConfirmOrNext = useCallback(() => {
    const { selectedOption, collectDataCompletedIds } = PaymentStore.state
    if (!selectedOption) return

    const needsCollectData = !!selectedOption.collectData?.url
    const alreadyCompleted = collectDataCompletedIds.includes(selectedOption.id)

    if (needsCollectData && !alreadyCompleted) {
      PaymentStore.setStep('collectData')
    } else {
      PaymentStore.approvePayment()
    }
  }, [])

  useEffect(() => {
    if (snap.step === 'confirm') {
      const options = snap.paymentOptions?.options || []

      if (options.length === 0) {
        PaymentStore.setResult({
          status: 'error',
          errorType: 'insufficient_funds',
          message: getErrorMessage('insufficient_funds'),
        })
        return
      }

      if (!snap.selectedOption) {
        onSelectOption(options[0] as PaymentOption)
      }
    }
  }, [snap.step, snap.paymentOptions?.options, snap.selectedOption, onSelectOption])

  const selectedNeedsCollectData = !!(
    snap.selectedOption &&
    (snap.selectedOption as PaymentOption).collectData?.url &&
    !snap.collectDataCompletedIds.includes(snap.selectedOption.id)
  )

  console.log('[PaymentOptionsModal] selectedNeedsCollectData:', selectedNeedsCollectData, {
    hasSelectedOption: !!snap.selectedOption,
    collectData: snap.selectedOption ? (snap.selectedOption as PaymentOption).collectData : null,
    collectDataUrl: snap.selectedOption ? (snap.selectedOption as PaymentOption).collectData?.url : null,
  })

  const showBackButton = snap.step === 'collectData'
  const hideHeader = snap.step === 'confirming'

  const renderContent = () => {
    switch (snap.step) {
      case 'loading':
        return (
          <Container css={{ padding: '40px 20px', textAlign: 'center' }}>
            <Loading size="xl" color="primary" />
            <Text css={{ marginTop: '20px' }} color="$gray700">
              {snap.loadingMessage || 'Preparing your payment...'}
            </Text>
          </Container>
        )

      case 'collectData':
        return (
          <CollectDataIframe
            url={selectedOptionCollectDataUrl!}
            onComplete={handleIframeComplete}
            onError={handleIframeError}
          />
        )

      case 'confirm':
        return (
          <ConfirmPaymentView
            info={snap.paymentOptions?.info}
            options={(snap.paymentOptions?.options || []) as PaymentOption[]}
            selectedOption={snap.selectedOption as PaymentOption | null}
            isLoadingActions={snap.isLoadingActions}
            isSigningPayment={false}
            error={snap.actionsError}
            onSelectOption={onSelectOption}
            onApprove={handleConfirmOrNext}
            showNextButton={selectedNeedsCollectData}
            collectDataCompletedIds={snap.collectDataCompletedIds as string[]}
          />
        )

      case 'confirming':
        return (
          <Container css={{
            padding: '40px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <Loading size="xl" color="primary" />
            <Text h4 css={{ marginTop: '20px' }}>
              Confirming your payment...
            </Text>
          </Container>
        )

      case 'result':
        return (
          <ResultView
            status={snap.resultStatus}
            errorType={snap.resultErrorType}
            message={snap.resultMessage}
            onClose={onClose}
          />
        )

      default:
        return (
          <Container css={{ padding: '40px 20px', textAlign: 'center' }}>
            <Loading size="xl" color="primary" />
            <Text css={{ marginTop: '20px' }} color="$gray700">Loading...</Text>
          </Container>
        )
    }
  }

  return (
    <>
      <Modal.Body css={{ padding: 0 }}>
        {!hideHeader && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: showBackButton ? 'space-between' : 'flex-end',
            padding: '12px 16px 0',
          }}>
            {showBackButton && (
              <button
                onClick={goBack}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ArrowBackIcon sx={{ fontSize: 24, color: '#666' }} />
              </button>
            )}
            <button
              onClick={showInfoExplainer ? () => setShowInfoExplainer(false) : onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CloseIcon sx={{ fontSize: 24, color: '#666' }} />
            </button>
          </div>
        )}

        <div style={{ padding: snap.step === 'result' ? '0' : '16px 24px 24px' }}>
          {showInfoExplainer ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '24px',
              textAlign: 'center',
            }}>
              <Text h4 css={{ marginBottom: '12px' }}>Why we need your information?</Text>
              <Text css={{ color: '$accents6', fontSize: '14px', lineHeight: '1.6', textAlign: 'left' }}>
                For regulatory compliance, we collect basic information on your first
                payment: full name, date of birth, and place of birth.
              </Text>
              <Text css={{ color: '$accents6', fontSize: '14px', lineHeight: '1.6', marginTop: '8px', textAlign: 'left' }}>
                This information is tied to your wallet address and this specific
                network. If you use the same wallet on this network again, you won&apos;t
                need to provide it again.
              </Text>
              <button
                onClick={() => setShowInfoExplainer(false)}
                style={{
                  marginTop: '24px',
                  padding: '12px 24px',
                  backgroundColor: '#0094FF',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Got it
              </button>
            </div>
          ) : (
            renderContent()
          )}
        </div>

        {snap.step === 'confirm' && selectedNeedsCollectData && !showInfoExplainer && (
          <div style={{ padding: '0 24px 16px', textAlign: 'center' }}>
            <button
              onClick={() => setShowInfoExplainer(true)}
              style={{
                background: 'none',
                border: '1px solid rgba(139, 139, 139, 0.3)',
                borderRadius: '8px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#888',
              }}
            >
              Why is info required?
            </button>
          </div>
        )}
      </Modal.Body>
    </>
  )
}
