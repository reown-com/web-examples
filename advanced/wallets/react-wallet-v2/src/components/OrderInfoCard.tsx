import { Col, Row, Text } from '@nextui-org/react'
import { useEffect, useState } from 'react'

/**
 * Types
 */
interface IProps {
  orderId: string
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

/**
 * Component
 */
export default function OrderInfoCard({ orderId, expiry }: IProps) {
  const [timeRemaining, setTimeRemaining] = useState(calculateTimeRemaining(expiry))

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
    <Row>
      <Col>
        <Text h5>Order Details</Text>
        <Text color="$gray400" size={'small'}>
          Order ID: {orderId}
        </Text>
        {timeRemaining ? (
          <Row align="center" css={{ gap: '8px' }}>
            <Text color={timeRemaining.isExpired ? '$error' : '$gray400'} size={'small'}>
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
    </Row>
  )
}
