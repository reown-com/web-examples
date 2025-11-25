import { useCallback, useEffect, useState } from 'react'
import { Button, Col, Divider, Loading, Row, Text } from '@nextui-org/react'
import SumsubWebSdk from '@sumsub/websdk-react'
import RequestModalContainer from '@/components/RequestModalContainer'
import ModalStore from '@/store/ModalStore'
import SettingsStore from '@/store/SettingsStore'
import { useSnapshot } from 'valtio'

type SumsubMessageType =
  | 'idCheck.onReady'
  | 'idCheck.onInitialized'
  | 'idCheck.onStepCompleted'
  | 'idCheck.onApplicantLoaded'
  | 'idCheck.onApplicantSubmitted'
  | 'idCheck.onApplicantResubmitted'
  | 'idCheck.onActionSubmitted'
  | 'idCheck.applicantStatus'
  | 'idCheck.moduleResultPresented'
  | 'idCheck.onResize'
  | 'idCheck.onVideoIdentCallStarted'
  | 'idCheck.onVideoIdentModeratorJoined'
  | 'idCheck.onVideoIdentCompleted'
  | 'idCheck.onUploadError'
  | 'idCheck.onUploadWarning'
  | 'idCheck.onApplicantStatusChanged'
  | string

interface SumsubMessage {
  applicantId?: string
  reviewResult?: {
    reviewAnswer?: string
  }
  reviewStatus?: string
}

export default function KycVerificationModal() {
  const { eip155Address, selectedKycAddress } = useSnapshot(SettingsStore.state)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [kycCompleted, setKycCompleted] = useState(false)
  const [kycSubmitted, setKycSubmitted] = useState(false)

  // Use selectedKycAddress if set, otherwise fall back to eip155Address
  const activeAddress = selectedKycAddress || eip155Address

  // Format address for display
  const formatAddress = (address: string) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Fetch access token on mount
  useEffect(() => {
    async function fetchAccessToken() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/sumsub/access-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ address: activeAddress })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to get access token')
        }

        const data = await response.json()
        setAccessToken(data.token)
      } catch (err) {
        console.error('Error fetching access token:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize KYC')
      } finally {
        setLoading(false)
      }
    }

    if (activeAddress) {
      fetchAccessToken()
    }
  }, [activeAddress])

  // Handler to refresh access token when it expires
  const handleAccessTokenExpiration = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch('/api/sumsub/access-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ address: activeAddress })
      })

      if (!response.ok) {
        throw new Error('Failed to refresh access token')
      }

      const data = await response.json()
      return data.token
    } catch (err) {
      console.error('Error refreshing access token:', err)
      throw err
    }
  }, [activeAddress])

  // Check KYC status from API
  const checkStatusFromApi = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/sumsub/status?address=${encodeURIComponent(activeAddress)}`
      )
      if (response.ok) {
        const data = await response.json()
        console.log('KYC status from API:', data)
        if (data.status === 'approved') {
          SettingsStore.setKycStatusForAddress(activeAddress, 'approved')
          setKycCompleted(true)
          return true
        } else if (data.status === 'pending') {
          SettingsStore.setKycStatusForAddress(activeAddress, 'pending')
        } else if (data.status === 'rejected') {
          SettingsStore.setKycStatusForAddress(activeAddress, 'rejected')
        }
      }
      return false
    } catch (err) {
      console.error('Error checking KYC status:', err)
      return false
    }
  }, [activeAddress])

  // Handle Sumsub SDK messages
  const handleMessage = useCallback(
    (type: SumsubMessageType, payload: SumsubMessage) => {
      console.log('Sumsub message:', type, payload)

      // Check for submission/completion events
      if (
        type === 'idCheck.onApplicantSubmitted' ||
        type === 'idCheck.onApplicantResubmitted' ||
        type === 'idCheck.actionCompleted' ||
        type === 'idCheck.onStepCompleted'
      ) {
        // User has submitted their documents
        setKycSubmitted(true)
        SettingsStore.setKycStatusForAddress(activeAddress, 'pending')
        // Check status from API after a short delay
        setTimeout(() => {
          checkStatusFromApi()
        }, 2000)
      }

      // Check for status changes
      if (type === 'idCheck.onApplicantStatusChanged' || type === 'idCheck.applicantStatus') {
        const reviewAnswer = payload?.reviewResult?.reviewAnswer
        if (reviewAnswer === 'GREEN') {
          SettingsStore.setKycStatusForAddress(activeAddress, 'approved')
          setKycCompleted(true)
        } else if (reviewAnswer === 'RED') {
          SettingsStore.setKycStatusForAddress(activeAddress, 'rejected')
        } else {
          // Check API for latest status
          checkStatusFromApi()
        }
      }

      // Also check on moduleResultPresented (when verification result is shown)
      if (type === 'idCheck.moduleResultPresented') {
        checkStatusFromApi()
      }
    },
    [activeAddress, checkStatusFromApi]
  )

  // Handle Sumsub SDK errors
  const handleError = useCallback((error: Error) => {
    console.error('Sumsub SDK error:', error)
    setError(error.message || 'KYC verification error occurred')
  }, [])

  // Close modal - check status before closing
  const handleClose = useCallback(async () => {
    // Check final status from API before closing
    await checkStatusFromApi()
    ModalStore.close()
  }, [checkStatusFromApi])

  // Render loading state
  if (loading) {
    return (
      <RequestModalContainer title="KYC Verification">
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Loading size="lg" />
          <Text css={{ marginTop: '$10' }}>Initializing verification...</Text>
        </div>
      </RequestModalContainer>
    )
  }

  // Render error state
  if (error) {
    return (
      <RequestModalContainer title="KYC Verification">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Text color="error" css={{ marginBottom: '$10' }}>
            {error}
          </Text>
          <Text color="$gray400" css={{ marginBottom: '$10' }}>
            Please ensure Sumsub is properly configured with valid API credentials.
          </Text>
          <Button auto color="primary" onClick={handleClose}>
            Close
          </Button>
        </div>
      </RequestModalContainer>
    )
  }

  // Render completion state
  if (kycCompleted) {
    return (
      <RequestModalContainer title="KYC Verification">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Text h3 color="success" css={{ marginBottom: '$10' }}>
            ✅ Verification Complete!
          </Text>
          <Text css={{ marginBottom: '$10' }}>
            Your identity has been verified. You can now use WalletConnect Pay.
          </Text>
          <Button auto color="success" onClick={handleClose}>
            Continue
          </Button>
        </div>
      </RequestModalContainer>
    )
  }

  // Render Sumsub SDK
  return (
    <RequestModalContainer title="KYC Verification">
      <div style={{ padding: '10px' }}>
        {/* <Row>
          <Col>
            <Text css={{ marginBottom: '$5' }}>
              To enable WalletConnect Pay, please complete identity verification.
            </Text>
            <Text color="$gray400" size="$sm" css={{ marginBottom: '$5' }}>
              Your data is securely processed by Sumsub.
            </Text>
            <Text
              size="$sm"
              css={{
                marginBottom: '$10',
                fontFamily: '$mono',
                backgroundColor: '$accents1',
                padding: '$2 $4',
                borderRadius: '$sm',
                display: 'inline-block'
              }}
            >
              Verifying: {formatAddress(activeAddress)}
            </Text>
          </Col>
        </Row>

        <Divider css={{ marginBottom: '$10' }} /> */}

        {accessToken && (
          <div
            style={{
              // maxHeight: '75vh',
              overflow: 'auto',
              borderRadius: '8px',
              backgroundColor: '#1a1a1a'
            }}
          >
            <SumsubWebSdk
              accessToken={accessToken}
              expirationHandler={handleAccessTokenExpiration}
              config={{
                lang: 'en',
                theme: 'dark'
              }}
              options={{
                addViewportTag: false,
                adaptIframeHeight: true
              }}
              onMessage={handleMessage}
              onError={handleError}
            />
          </div>
        )}

        <Divider css={{ marginTop: '$10', marginBottom: '$10' }} />

        <Row justify="space-between" align="center">
          {kycSubmitted && (
            <Button
              auto
              size="sm"
              color="primary"
              onClick={async () => {
                const approved = await checkStatusFromApi()
                if (approved) {
                  // Status will update and show completion screen
                }
              }}
            >
              Check Verification Status
            </Button>
          )}
          <Button auto flat color="error" onClick={handleClose}>
            {kycSubmitted ? 'Close' : 'Cancel'}
          </Button>
        </Row>
      </div>
    </RequestModalContainer>
  )
}
