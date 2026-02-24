import { Fragment, useCallback } from 'react'
import { Text, Loading } from '@nextui-org/react'
import type { PaymentOption, PaymentInfo } from '@walletconnect/pay'
import MerchantInfo from './MerchantInfo'
import { formatAmount, getCurrencySymbol } from './utils'

const MAX_VISIBLE_OPTIONS = 4
const OPTION_HEIGHT = 64
const OPTION_GAP = 8

interface OptionItemProps {
  option: PaymentOption
  isSelected: boolean
  hasCollectData: boolean
  onSelect: (option: PaymentOption) => void
}

function OptionItem({ option, isSelected, hasCollectData, onSelect }: OptionItemProps) {
  const amount = formatAmount(
    option.amount.value,
    option.amount.display.decimals,
    2,
  )

  return (
    <button
      onClick={() => onSelect(option)}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        borderRadius: '16px',
        border: 'none',
        cursor: 'pointer',
        width: '100%',
        backgroundColor: isSelected
          ? 'rgba(0, 148, 255, 0.1)'
          : 'rgba(139, 139, 139, 0.08)',
        transition: 'background-color 0.2s',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flex: 1,
      }}>
        <div style={{ position: 'relative', width: '36px', height: '36px' }}>
          <img
            src={option.amount.display.iconUrl}
            alt={option.amount.display.assetSymbol}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              objectFit: 'cover',
            }}
          />
          {option.amount.display.networkIconUrl && (
            <img
              src={option.amount.display.networkIconUrl}
              alt={option.amount.display.networkName}
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                position: 'absolute',
                right: '-2px',
                bottom: '-2px',
                border: isSelected
                  ? '2px solid rgba(0, 148, 255, 0.1)'
                  : '2px solid rgba(139, 139, 139, 0.08)',
              }}
            />
          )}
        </div>
        <Text css={{ fontWeight: '500', fontSize: '15px', color: '$text' }}>
          {amount} {option.amount.display.assetSymbol}
        </Text>
        {hasCollectData && (
          <span style={{
            marginLeft: 'auto',
            padding: '3px 10px',
            borderRadius: '100px',
            backgroundColor: 'rgba(245, 166, 35, 0.12)',
            fontSize: '12px',
            fontWeight: '500',
            color: '#F5A623',
            whiteSpace: 'nowrap',
          }}>
            Info required
          </span>
        )}
      </div>
    </button>
  )
}

interface ConfirmPaymentViewProps {
  options: PaymentOption[]
  selectedOption: PaymentOption | null
  isLoadingActions: boolean
  isSigningPayment: boolean
  error: string | null
  onSelectOption: (option: PaymentOption) => void
  onApprove: () => void
  info?: PaymentInfo
  showNextButton: boolean
  collectDataCompletedIds: string[]
}

export default function ConfirmPaymentView({
  options,
  selectedOption,
  onSelectOption,
  onApprove,
  info,
  isLoadingActions,
  showNextButton,
  collectDataCompletedIds,
}: ConfirmPaymentViewProps) {
  const payAmount = formatAmount(
    info?.amount?.value || '0',
    info?.amount?.display?.decimals || 0,
    2,
  )
  const currencySymbol = getCurrencySymbol(info?.amount?.display?.assetSymbol)

  const selectedCompleted =
    selectedOption && collectDataCompletedIds.includes(selectedOption.id)
  const visibleOptions = selectedCompleted
    ? options.filter(o => o.id === selectedOption.id)
    : options

  const scrollable = visibleOptions.length > MAX_VISIBLE_OPTIONS
  const listMaxHeight =
    MAX_VISIBLE_OPTIONS * OPTION_HEIGHT + (MAX_VISIBLE_OPTIONS - 1) * OPTION_GAP

  const handleSelectOption = useCallback(
    (option: PaymentOption) => {
      onSelectOption(option)
    },
    [onSelectOption],
  )

  return (
    <Fragment>
      <MerchantInfo info={info} />

      <div style={{
        marginTop: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: `${OPTION_GAP}px`,
        ...(scrollable ? { maxHeight: `${listMaxHeight}px`, overflowY: 'auto' as const } : {}),
      }}>
        {visibleOptions.map(option => {
          const hasCollectData = !!option.collectData?.url && !collectDataCompletedIds.includes(option.id)
          console.log('[ConfirmPaymentView] option', option.id, {
            collectData: option.collectData,
            collectDataUrl: option.collectData?.url,
            hasCollectData,
          })
          return (
            <OptionItem
              key={option.id}
              option={option}
              isSelected={option.id === selectedOption?.id}
              hasCollectData={hasCollectData}
              onSelect={handleSelectOption}
            />
          )
        })}
      </div>

      <div style={{ marginTop: '20px', marginBottom: '8px' }}>
        <button
          onClick={onApprove}
          disabled={isLoadingActions || !selectedOption}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: isLoadingActions || !selectedOption ? '#ccc' : '#0094FF',
            color: 'white',
            border: 'none',
            borderRadius: '16px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: isLoadingActions || !selectedOption ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          {isLoadingActions && <Loading size="xs" color="white" />}
          {showNextButton ? 'Next' : `Pay ${currencySymbol}${payAmount}`}
        </button>
      </div>
    </Fragment>
  )
}
