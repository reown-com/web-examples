import { useCallback, useEffect } from 'react'
import { useSnapshot } from 'valtio'
import ModalStore from '@/store/ModalStore'
import PaymentStore from '@/store/PaymentStore'
import {
  detectErrorType,
  formatAmount,
  getCurrencySymbol,
  getErrorMessage,
  getErrorTitle
} from './paymentUtils'
import type { PaymentInfo, PaymentOption } from './paymentUtils'
import CollectDataPopup from './CollectDataPopup'

export default function PaymentModal() {
  const snap = useSnapshot(PaymentStore.state)

  const selectedOption = snap.selectedOption as PaymentOption | null
  const info = snap.paymentOptions?.info as PaymentInfo | undefined
  const options = (snap.paymentOptions?.options ?? []) as PaymentOption[]

  const onClose = useCallback(() => {
    PaymentStore.reset()
    ModalStore.close()
  }, [])

  const onSelectOption = useCallback((option: PaymentOption) => {
    PaymentStore.selectOption(option)
    PaymentStore.fetchPaymentActions(option)
  }, [])

  // loading → confirm / result
  useEffect(() => {
    if (snap.step !== 'loading') return
    if (snap.errorMessage) {
      const errorType = detectErrorType(snap.errorMessage)
      PaymentStore.setResult({
        status: 'error',
        message: getErrorMessage(errorType, snap.errorMessage),
        errorType
      })
    } else if (snap.paymentOptions) {
      if (!snap.paymentOptions.options?.length) {
        PaymentStore.setResult({
          status: 'error',
          errorType: 'insufficient_funds',
          message: getErrorMessage('insufficient_funds')
        })
      } else {
        PaymentStore.setStep('confirm')
      }
    }
  }, [snap.step, snap.paymentOptions, snap.errorMessage])

  // confirm → preselect first option
  useEffect(() => {
    if (snap.step !== 'confirm') return
    if (!options.length) {
      PaymentStore.setResult({
        status: 'error',
        errorType: 'insufficient_funds',
        message: getErrorMessage('insufficient_funds')
      })
      return
    }
    if (!snap.selectedOption) onSelectOption(options[0])
  }, [snap.step, options, snap.selectedOption, onSelectOption])

  const selectedNeedsCollectData = !!(
    selectedOption?.collectData?.url && !snap.collectDataCompletedIds.includes(selectedOption.id)
  )

  const handleConfirmOrNext = useCallback(() => {
    const option = PaymentStore.state.selectedOption
    if (!option) return
    const needsCollectData = !!option.collectData?.url
    const alreadyCompleted = PaymentStore.state.collectDataCompletedIds.includes(option.id)
    if (needsCollectData && !alreadyCompleted) {
      PaymentStore.setStep('collectData')
    } else {
      PaymentStore.approvePayment()
    }
  }, [])

  const payAmount = formatAmount(
    info?.amount?.value || '0',
    info?.amount?.display?.decimals || 0,
    2
  )
  const currencySymbol = getCurrencySymbol(info?.amount?.display?.assetSymbol)

  return (
    <div className="modal">
      {snap.step === 'loading' && (
        <div className="pay-center">
          <div className="spinner" />
          <p className="muted">{snap.loadingMessage || 'Preparing your payment…'}</p>
        </div>
      )}

      {snap.step === 'confirm' && (
        <>
          {info?.merchant && (
            <div className="pay-merchant">
              <div className="pay-merchant-icon">
                {info.merchant.iconUrl ? (
                  <img src={info.merchant.iconUrl} alt={info.merchant.name} />
                ) : (
                  <span>{info.merchant.name?.charAt(0) || 'M'}</span>
                )}
              </div>
              <h2>
                Pay {currencySymbol}
                {payAmount} to {info.merchant.name}
              </h2>
            </div>
          )}

          <div className="pay-options">
            {options.map(option => {
              const amount = formatAmount(
                option.amount.value,
                option.amount.display.decimals,
                2
              )
              const hasCollectData =
                !!option.collectData?.url && !snap.collectDataCompletedIds.includes(option.id)
              return (
                <button
                  key={option.id}
                  className={`pay-option${option.id === selectedOption?.id ? ' selected' : ''}`}
                  onClick={() => onSelectOption(option)}
                >
                  <span className="pay-option-icon">
                    {option.amount.display.iconUrl && (
                      <img src={option.amount.display.iconUrl} alt="" />
                    )}
                    {option.amount.display.networkIconUrl && (
                      <img
                        className="pay-network-icon"
                        src={option.amount.display.networkIconUrl}
                        alt=""
                      />
                    )}
                  </span>
                  <span className="pay-option-amount">
                    {amount} {option.amount.display.assetSymbol}
                    {option.amount.display.networkName && (
                      <span className="muted"> · {option.amount.display.networkName}</span>
                    )}
                  </span>
                  {hasCollectData && <span className="pay-badge">Info required</span>}
                </button>
              )
            })}
          </div>

          {snap.actionsError && <div className="banner error">{snap.actionsError}</div>}

          <button
            className="pay-primary"
            onClick={handleConfirmOrNext}
            disabled={snap.isLoadingActions || !selectedOption}
          >
            {snap.isLoadingActions
              ? 'Loading…'
              : selectedNeedsCollectData
                ? 'Next'
                : `Pay ${currencySymbol}${payAmount}`}
          </button>
        </>
      )}

      {snap.step === 'collectData' && selectedOption?.collectData?.url && (
        <CollectDataPopup
          url={selectedOption.collectData.url}
          onComplete={() => {
            PaymentStore.markCollectDataCompleted(selectedOption.id)
            PaymentStore.setStep('confirm')
          }}
          onError={error => {
            const errorType = detectErrorType(error)
            PaymentStore.setResult({
              status: 'error',
              message: getErrorMessage(errorType, error),
              errorType
            })
          }}
        />
      )}

      {snap.step === 'confirming' && (
        <div className="pay-center">
          <div className="spinner" />
          <h2>Confirming your payment…</h2>
        </div>
      )}

      {snap.step === 'result' && (
        <div className="pay-center">
          {snap.resultStatus === 'success' ? (
            <>
              <div className="pay-result-icon success">✓</div>
              <h2>{snap.resultMessage || 'Your payment has been confirmed'}</h2>
            </>
          ) : (
            <>
              <div className="pay-result-icon error">!</div>
              <h2>{snap.resultErrorType ? getErrorTitle(snap.resultErrorType) : 'Payment failed'}</h2>
              <p className="muted">{snap.resultMessage}</p>
            </>
          )}
          <button className="pay-primary" onClick={onClose}>
            {snap.resultStatus === 'success' ? 'Got it!' : 'Close'}
          </button>
        </div>
      )}
    </div>
  )
}
