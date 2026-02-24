import { Fragment } from 'react'
import { Text } from '@nextui-org/react'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

import type { ErrorType } from './utils'
import { getErrorTitle } from './utils'

interface ResultViewProps {
  status: 'success' | 'error'
  errorType?: ErrorType | null
  message?: string
  onClose: () => void
}

export default function ResultView({
  status,
  errorType,
  message,
  onClose,
}: ResultViewProps) {
  const isSuccess = status === 'success'
  const defaultMessage = isSuccess
    ? 'Your payment has been confirmed'
    : 'An error occurred'

  const renderIcon = () => {
    if (isSuccess) {
      return <CheckCircleIcon sx={{ fontSize: 48, color: '#17C964' }} />
    }

    const iconColor = '#0988F0'
    switch (errorType) {
      case 'insufficient_funds':
        return <AccountBalanceWalletIcon sx={{ fontSize: 48, color: iconColor }} />
      case 'expired':
        return <AccessTimeIcon sx={{ fontSize: 48, color: iconColor }} />
      case 'not_found':
      case 'generic':
      default:
        return <WarningAmberIcon sx={{ fontSize: 48, color: iconColor }} />
    }
  }

  return (
    <Fragment>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
        textAlign: 'center',
      }}>
        {renderIcon()}

        {isSuccess ? (
          <Text h4 css={{ marginTop: '12px', fontWeight: '500', textAlign: 'center' }}>
            {message || defaultMessage}
          </Text>
        ) : (
          <>
            {errorType && (
              <Text h4 css={{ marginTop: '12px', fontWeight: '500', textAlign: 'center' }}>
                {getErrorTitle(errorType)}
              </Text>
            )}
            <Text css={{
              marginTop: '8px',
              color: '$accents6',
              fontSize: '15px',
              textAlign: 'center',
            }}>
              {message || defaultMessage}
            </Text>
          </>
        )}

        <div style={{ paddingTop: '32px', width: '100%' }}>
          <button
            onClick={onClose}
            style={{
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
            }}
          >
            {isSuccess ? 'Got it!' : 'Close'}
          </button>
        </div>
      </div>
    </Fragment>
  )
}
