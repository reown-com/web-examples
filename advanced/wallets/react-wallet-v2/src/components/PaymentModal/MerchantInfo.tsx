import { Text } from '@nextui-org/react'
import type { PaymentInfo } from '@walletconnect/pay'
import VerifiedIcon from '@mui/icons-material/Verified'
import { formatAmount, getCurrencySymbol } from './utils'

interface MerchantInfoProps {
  info?: PaymentInfo
}

export default function MerchantInfo({ info }: MerchantInfoProps) {
  const amount = formatAmount(
    info?.amount?.value || '0',
    info?.amount?.display?.decimals || 0,
    2,
  )
  const currencySymbol = getCurrencySymbol(info?.amount?.display?.assetSymbol)

  if (!info?.merchant) return null

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      padding: '0 60px',
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '16px',
        backgroundColor: '#1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {info.merchant.iconUrl ? (
          <img
            src={info.merchant.iconUrl}
            alt={info.merchant.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Text b css={{ color: 'white', fontSize: '24px' }}>
            {info.merchant.name?.charAt(0) || 'M'}
          </Text>
        )}
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <Text h4 css={{ margin: 0, fontWeight: '600', textAlign: 'center' }}>
          Pay {currencySymbol}{amount} to {info.merchant.name}
        </Text>
        <VerifiedIcon sx={{ fontSize: 20, color: '#0094FF', flexShrink: 0 }} />
      </div>
    </div>
  )
}
