import { useState, useEffect, useRef } from 'react'
import { Text, Row, Spacer, Container, Card, Avatar, Grid } from '@nextui-org/react'
import { DetailedPaymentOption } from '@/types/wallet_checkout'
import WalletCheckoutUtil from '@/utils/WalletCheckoutUtil'
import Image from 'next/image'
import { formatUnits } from 'viem'

interface PaymentOptionsProps {
  payments: DetailedPaymentOption[]
  onSelectPayment?: (payment: DetailedPaymentOption) => void
}

// Style variables
const styles = {
  dropdownContainer: {
    position: 'relative' as const
  },
  dropdownButton: {
    padding: '8px 16px',
    background: '$accents0',
    border: '1px solid $border',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      transform: 'translateY(-2px)'
    }
  },
  cardBody: {
    overflow: 'visible' as const,
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: '4px 0'
  },
  contentWrapper: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    width: '100%'
  },
  chevronContainer: {
    marginLeft: 'auto'
  },
  dropdownMenu: {
    position: 'absolute' as const,
    top: 'calc(100% + 8px)',
    left: 0,
    right: 0,
    zIndex: 1000,
    padding: '4px 8px',
    boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.3)',
    maxHeight: '300px',
    overflow: 'auto' as const,
    backgroundColor: '#2a2a2a'
  },
  emptyState: {
    backgroundColor: '#f7f8f9',
    padding: '16px',
    borderRadius: '14px',
    textAlign: 'center' as const
  },
  avatarWrapper: {
    position: 'relative' as const,
    marginRight: '12px'
  },
  chainIconWrapper: {
    position: 'absolute' as const,
    right: '-6px',
    bottom: '-6px',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    overflow: 'hidden' as const,
    zIndex: 2,
    backgroundColor: '#333333',
    border: '2px solid #1a1a1a',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const
  },
  checkmark: {
    position: 'absolute' as const,
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#17c964',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    color: 'white',
    boxShadow: '0 2px 8px rgba(23, 201, 100, 0.5)'
  },
  chainImage: {
    objectFit: 'cover' as const,
    borderRadius: '50%'
  }
}

// Simple hook to detect clicks outside an element
const useClickAway = (onClickAway: () => void) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClickAway()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClickAway])

  return ref
}

export default function CustomPaymentDropdown({ payments, onSelectPayment }: PaymentOptionsProps) {
  const [selectedIndex, setSelectedIndex] = useState(payments.length > 0 ? 0 : -1)
  const [isOpen, setIsOpen] = useState(false)
  const { formatRecipient } = WalletCheckoutUtil

  // Reference to detect clicks outside dropdown
  const dropdownRef = useClickAway(() => {
    setIsOpen(false)
  })

  // Set the initial payment option when component loads or when payments change
  useEffect(() => {
    if (payments.length > 0 && selectedIndex === -1) {
      setSelectedIndex(0)
    }

    if (
      payments.length > 0 &&
      selectedIndex >= 0 &&
      selectedIndex < payments.length &&
      onSelectPayment
    ) {
      onSelectPayment(payments[selectedIndex])
    }
  }, [payments, selectedIndex, onSelectPayment])

  const handleSelect = (index: number) => {
    setSelectedIndex(index)
    setIsOpen(false)

    if (onSelectPayment && index >= 0 && index < payments.length) {
      onSelectPayment(payments[index])
    }
  }

  // Get style for dropdown item
  const getDropdownItemStyle = (isSelected: boolean, isLast: boolean) => ({
    cursor: 'pointer' as const,
    padding: '8px 4px',
    borderRadius: '8px',
    backgroundColor: isSelected ? 'rgba(23, 201, 100, 0.2)' : 'transparent',
    position: 'relative' as const,
    marginBottom: 0,
    borderBottom: isLast ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
    paddingBottom: '8px',
    marginTop: '8px',
    transition: 'all 0.2s ease'
  })

  // Handle hover effects
  const handleMouseOver = (e: React.MouseEvent<HTMLDivElement>, isSelected: boolean) => {
    if (!isSelected) {
      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
    }
  }

  const handleMouseOut = (e: React.MouseEvent<HTMLDivElement>, isSelected: boolean) => {
    if (!isSelected) {
      e.currentTarget.style.backgroundColor = 'transparent'
    }
  }

  // Render payment option
  const renderPaymentOption = (payment: DetailedPaymentOption) => (
    <Row align="center" css={{ width: '100%' }}>
      <div style={styles.avatarWrapper}>
        {payment.assetMetadata.assetIcon ? (
          <Avatar
            src={payment.assetMetadata.assetIcon}
            bordered={false}
            color="primary"
            css={{ zIndex: 1 }}
            text={payment.assetMetadata.assetSymbol.charAt(0)}
            size="sm"
          />
        ) : (
          <Avatar
            bordered={false}
            color="primary"
            css={{ zIndex: 1 }}
            text={payment.assetMetadata.assetSymbol.charAt(0)}
            size="sm"
          />
        )}
        {payment.chainMetadata.chainIcon && (
          <div style={styles.chainIconWrapper}>
            <Image
              src={payment.chainMetadata.chainIcon}
              width={14}
              height={14}
              style={styles.chainImage}
              alt={payment.chainMetadata.chainName}
            />
          </div>
        )}
      </div>

      <Grid.Container direction="column" css={{ margin: 0, padding: 0 }}>
        <Text size={12} css={{ color: '#aaaaaa', lineHeight: 1.2 }}>
          {payment.recipient! ? `To: ${formatRecipient(payment.recipient!)}` : ''}
        </Text>
        <Text b size={14} css={{ lineHeight: 1.2, color: 'white' }}>
          {formatUnits(BigInt(payment.amount), payment.assetMetadata.assetDecimals).toString()}{' '}
          {payment.assetMetadata.assetSymbol}
        </Text>
      </Grid.Container>
    </Row>
  )

  // Render chevron icon
  const renderChevron = () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s ease'
      }}
    >
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  )

  // Render checkmark icon
  const renderCheckmark = () => (
    <div style={styles.checkmark}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
  )

  return (
    <>
      <Row justify="space-between" align="center">
        <Text h5 css={{ color: '$text', fontWeight: '600' }}>
          Payment Option
        </Text>
      </Row>
      <Spacer y={0.5} />

      <Container css={{ padding: '0' }}>
        {payments.length > 0 ? (
          <div ref={dropdownRef} style={styles.dropdownContainer}>
            {/* Dropdown Button */}
            <Card onClick={() => setIsOpen(!isOpen)} css={styles.dropdownButton}>
              <Card.Body css={styles.cardBody}>
                <div style={styles.contentWrapper}>
                  {selectedIndex >= 0 &&
                    selectedIndex < payments.length &&
                    renderPaymentOption(payments[selectedIndex])}

                  <div style={styles.chevronContainer}>{renderChevron()}</div>
                </div>
              </Card.Body>
            </Card>

            {/* Dropdown Menu */}
            {isOpen && (
              <Card css={styles.dropdownMenu}>
                {payments.map((payment, idx) => {
                  const isSelected = selectedIndex === idx
                  const isLastItem = idx === payments.length - 1

                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelect(idx)}
                      style={getDropdownItemStyle(isSelected, isLastItem)}
                      onMouseOver={e => handleMouseOver(e, isSelected)}
                      onMouseOut={e => handleMouseOut(e, isSelected)}
                    >
                      {renderPaymentOption(payment)}
                      {isSelected && renderCheckmark()}
                    </div>
                  )
                })}
              </Card>
            )}
          </div>
        ) : (
          <Card css={styles.emptyState}>
            <Card.Body>
              <Text css={{ color: '$accents7' }}>No payment options available</Text>
            </Card.Body>
          </Card>
        )}
      </Container>
    </>
  )
}
