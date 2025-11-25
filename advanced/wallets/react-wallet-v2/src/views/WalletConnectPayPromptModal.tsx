import { useCallback } from 'react'
import { Button, Col, Row, Text } from '@nextui-org/react'
import Image from 'next/image'
import RequestModalContainer from '@/components/RequestModalContainer'
import ModalStore from '@/store/ModalStore'
import SettingsStore from '@/store/SettingsStore'

export default function WalletConnectPayPromptModal() {
  // Handle "Yes" - enable WalletConnect Pay and start KYC
  const handleEnable = useCallback(async () => {
    // Enable WalletConnect Pay
    SettingsStore.setWalletConnectPayEnabled(true)

    // Close this modal and open KYC modal
    ModalStore.close()

    // Small delay to let the modal close animation complete
    setTimeout(() => {
      ModalStore.open('KycVerificationModal', {})
    }, 300)
  }, [])

  // Handle "No" - just close the modal
  const handleDecline = useCallback(() => {
    ModalStore.close()
  }, [])

  return (
    <RequestModalContainer title="">
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Row justify="center" css={{ marginBottom: '$10' }}>
          <Image
            src="/walletconnect-pay.png"
            alt="WalletConnect Pay"
            width={280}
            height={280}
            style={{ borderRadius: '16px' }}
          />
        </Row>

        <Text h3 css={{ marginBottom: '$5' }}>
          Enable WalletConnect Pay
        </Text>

        <Text color="$gray400" css={{ marginBottom: '$10' }}>
          Complete a quick identity verification to unlock WalletConnect Pay features and seamless
          payments.
        </Text>

        <Row justify="center" css={{ gap: '$8', marginTop: '$10' }}>
          <Button auto size="lg" color="primary" onClick={handleEnable}>
            Yes, Enable
          </Button>
          <Button auto size="lg" flat color="default" onClick={handleDecline}>
            Maybe Later
          </Button>
        </Row>
      </div>
    </RequestModalContainer>
  )
}
