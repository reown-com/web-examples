import { Col, Row, Text } from '@nextui-org/react'
import { formatDistance, format, isBefore } from 'date-fns'

/**
 * Types
 */
interface IProps {
  orderId: string
  expiry?: number
}

/**
 * Helper function to format expiry time using date-fns
 */
const formatExpiryTime = (timestamp?: number) => {
  if (!timestamp) return 'No expiry set';
  
  const expiryDate = new Date(timestamp * 1000);
  const now = new Date();
  
  // Check if already expired
  if (isBefore(expiryDate, now)) {
    return 'Expired';
  }
  
  // For time within the next 24 hours, show relative time
  if (isBefore(expiryDate, new Date(now.getTime() + 24 * 60 * 60 * 1000))) {
    return `Expires in ${formatDistance(expiryDate, now, { addSuffix: false })}`;
  }
  
  // Otherwise show formatted date and time
  return `Expires on ${format(expiryDate, 'MMM d, yyyy h:mm a')}`;
};

/**
 * Component
 */
export default function OrderInfoCard({ orderId, expiry }: IProps) {
  const isExpired = expiry && isBefore(new Date(expiry * 1000), new Date());
  const expiryText = formatExpiryTime(expiry);
  
  return (
    <Row>
      <Col>
        <Text h5>Order Details</Text>
        <Text color="$gray400" size={'small'}>
          Order ID: {orderId}
        </Text>
        <Text 
          color={isExpired ? "$error" : "$gray400"} 
          size={'small'}
        >
          {expiryText}
        </Text>
      </Col>
    </Row>
  )
}