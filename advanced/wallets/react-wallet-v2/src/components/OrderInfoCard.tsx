import { DetailedPaymentOption } from '@/types/wallet_checkout'
import { Avatar, Col, Link, Row, styled, StyledLink, Text } from '@nextui-org/react'
import { useEffect, useState } from 'react'
import { CoreTypes } from '@walletconnect/types'
import OrderDetailIcon from './PaymentCheckout/visual/OrderDetailIcon'
import WalletCheckoutUtil from '@/utils/WalletCheckoutUtil'
import { formatUnits } from 'viem'
import { useSnapshot } from 'valtio'
import SettingsStore from '@/store/SettingsStore'
import BadgeCheckIcon from './PaymentCheckout/visual/BadgeCheckIcon'
import BadgeAlertIcon from './PaymentCheckout/visual/BadgeAlertIcon'

/**
 * Types
 */
interface IProps {
  selectedPayment: DetailedPaymentOption | null
  orderId: string
  metadata: CoreTypes.Metadata
  expiry?: number
}

/**
 * Helper function to calculate time remaining for countdown
 */
const calculateTimeRemaining = (expiryTimestamp?: number) => {
  if (!expiryTimestamp) return null

  const expiryTime = expiryTimestamp * 1000 // Convert to milliseconds
  const now = Date.now()

  // Check if already expired
  if (now >= expiryTime) {
    return { hours: 0, minutes: 0, seconds: 0, isExpired: true }
  }

  // Calculate remaining time
  const timeRemaining = expiryTime - now

  const hours = Math.floor(timeRemaining / (1000 * 60 * 60))
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000)

  return { hours, minutes, seconds, isExpired: false }
}

export default function OrderInfoCard({ orderId, expiry, selectedPayment, metadata }: IProps) {
  const styles = {
    iconWrapper: {
      width: '40px',
      height: '40px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    },
    circleIconBg: {
      display: 'flex',
      backgroundColor: '#333',
      height: '32px',
      width: '32px',
      borderRadius: '50%',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }
  const [timeRemaining, setTimeRemaining] = useState(calculateTimeRemaining(expiry))
  const { currentRequestVerifyContext } = useSnapshot(SettingsStore.state)
  const validation = currentRequestVerifyContext?.verified.validation
  const { icons, name, url } = metadata
  const isVerified = validation == 'VALID'
  // Update countdown every second
  useEffect(() => {
    if (!expiry) return

    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(expiry))
    }, 1000)

    // Clean up on unmount
    return () => clearInterval(interval)
  }, [expiry])

  // Format the countdown display
  const formatCountdown = () => {
    if (!timeRemaining) return 'No expiry set'
    if (timeRemaining.isExpired) return 'Expired'

    const { hours, minutes, seconds } = timeRemaining

    // Create a readable time format
    const parts = []

    if (hours > 0) {
      parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`)
    }

    if (minutes > 0 || hours > 0) {
      parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`)
    }

    // Always show seconds if less than 1 hour remains
    if (seconds > 0 || parts.length === 0) {
      parts.push(`${seconds} ${seconds === 1 ? 'second' : 'seconds'}`)
    }

    // If we're under 1 minute, just show seconds
    if (hours === 0 && minutes === 0) {
      return parts.join(' ')
    }

    // If we're under 1 hour, show minutes and seconds
    if (hours === 0) {
      return parts.join(' ')
    }

    // If more than 1 hour, show hours and minutes
    return parts.join(' ')
  }

  return (
    <Col css={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
      <div style={styles.iconWrapper}>
        <div style={styles.circleIconBg}>
          <OrderDetailIcon />
        </div>
      </div>
      <Col css={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '4px' }}>
      <Row align="center" justify="space-between">
        <Text color="$gray400">Merchant</Text>
        <Text css={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {isVerified ? (
            <BadgeCheckIcon color="green" size={16} />
          ) : (
            <BadgeAlertIcon color="#F5A623" size={16} />
          )}
          {name || 'Unknown'}
        </Text>
      </Row>
      
        {selectedPayment && selectedPayment.recipient && (
          <Row align="center" justify="space-between">
            <Text color="$gray400">Address</Text>
            <Text>{WalletCheckoutUtil.formatRecipient(selectedPayment.recipient)}</Text>
          </Row>
        )}
        {selectedPayment && selectedPayment.fee && (
          <Row align="center" justify="space-between">
            <Text color="$gray400">Estimated Gas Fee</Text>
            <Text>
              ~
              {Number(
                formatUnits(BigInt(selectedPayment.fee.gasFee), selectedPayment.fee.decimals)
              ).toFixed(6)}{' '}
              {selectedPayment.fee.feeSymbol}
            </Text>
          </Row>
        )}
        <Row align="center" justify="space-between">
          <Text color="$gray400">Order ID</Text>
          <Text size={'small'}>{orderId}</Text>
        </Row>
        {timeRemaining ? (
          <Row align="center" justify="space-between">
            <Text color={timeRemaining.isExpired ? '$error' : '$gray400'}>
              {timeRemaining.isExpired ? 'Expired' : 'Expires in: '}
            </Text>
            {!timeRemaining.isExpired && (
              <Text
                css={{
                  fontWeight: 'bold',
                  padding: '2px 0',
                  color: timeRemaining.hours < 1 ? '$warning' : '$gray800'
                }}
                size={'small'}
              >
                {formatCountdown()}
              </Text>
            )}
          </Row>
        ) : (
          <Text color="$gray400" size={'small'}>
            No expiry set
          </Text>
        )}
      </Col>
    </Col>
  )
}
