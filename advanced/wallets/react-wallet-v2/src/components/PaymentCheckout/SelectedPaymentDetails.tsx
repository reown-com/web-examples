import { useState, useEffect, useRef, useCallback } from 'react'
import { Text, Row, Container, Col, Card, Divider, Spacer } from '@nextui-org/react'
import { DetailedPaymentOption } from '@/types/wallet_checkout'
import Image from 'next/image'
import { formatUnits } from 'viem'
import { GiftIcon } from './visual/GiftIcon'
import WalletIcon from './visual/WalletIcon'

// Selected Payment Details Component
interface SelectedPaymentDetailsProps {
  selectedPayment: DetailedPaymentOption | null
}

const SelectedPaymentDetails = ({ selectedPayment }: SelectedPaymentDetailsProps) => {
  if (!selectedPayment) {
    return null
  }
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

  const formattedBalance = formatUnits(
    selectedPayment.assetMetadata.assetBalance,
    selectedPayment.assetMetadata.assetDecimals
  )

  return (
    <Card
      css={{
        backgroundColor: '#222',
        borderRadius: '24px',
        padding: '12px',
        marginTop: '16px'
      }}
    >
      <Card.Body css={{ padding: '12px 0' }}>
        <Row align="center" css={{ marginBottom: '12px' }}>
          <Row align="center" css={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={styles.iconWrapper}>
              <div style={styles.circleIconBg}>
                <WalletIcon />
              </div>
            </div>
            <Text css={{ color: '#aaa', fontSize: '14px' }}>Balance</Text>
          </Row>
          <Col span={8} css={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <Text css={{ color: '#fff', fontSize: '14px', justifyContent: 'flex-end' }}>
              {formattedBalance.length > 4
                ? parseFloat(formattedBalance).toFixed(3)
                : formattedBalance}{' '}
              {selectedPayment.assetMetadata.assetSymbol}
            </Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Text css={{ color: '#aaa', fontSize: '14px', whiteSpace: 'nowrap' }}>
                on {selectedPayment.chainMetadata.chainName}
              </Text>
              <div style={{ alignItems: 'center', display: 'flex', width: '16px', height: '16px' }}>
                <Image
                  src={selectedPayment.chainMetadata.chainIcon}
                  width={16}
                  height={16}
                  alt={selectedPayment.chainMetadata.chainName}
                  style={{ borderRadius: '50%', marginLeft: '4px' }}
                />
              </div>
            </div>
          </Col>
        </Row>

        <Row align="center" justify="space-between" css={{ marginBottom: '12px' }}>
          <Row align="center" css={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={styles.iconWrapper}>
              <div style={styles.circleIconBg}>
                <GiftIcon />
              </div>
            </div>
            <Text css={{ color: '#aaa', fontSize: '14px' }}>Send</Text>
          </Row>
          <Col span={8} css={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <Text css={{ color: '#fff', fontSize: '14px', justifyContent: 'flex-end' }}>
              {formatUnits(
                BigInt(selectedPayment.amount),
                selectedPayment.assetMetadata.assetDecimals
              ).toString()}{' '}
              {selectedPayment.assetMetadata.assetSymbol}
            </Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Text css={{ color: '#aaa', fontSize: '14px', whiteSpace: 'nowrap' }}>
                on {selectedPayment.chainMetadata.chainName}
              </Text>
              <div style={{ alignItems: 'center', display: 'flex', width: '16px', height: '16px' }}>
                <Image
                  src={selectedPayment.chainMetadata.chainIcon}
                  width={16}
                  height={16}
                  alt={selectedPayment.chainMetadata.chainName}
                  style={{ borderRadius: '50%', marginLeft: '4px' }}
                />
              </div>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  )
}

export default SelectedPaymentDetails
