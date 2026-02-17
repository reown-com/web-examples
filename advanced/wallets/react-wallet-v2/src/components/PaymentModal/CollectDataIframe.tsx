import { useCallback, useEffect, useRef, useState } from 'react'
import { Loading, Text } from '@nextui-org/react'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'

const WHITELISTED_ORIGINS = [
  'https://dev.pay.walletconnect.com',
  'https://staging.pay.walletconnect.com',
  'https://pay.walletconnect.com',
]

function buildUrlWithTheme(baseUrl: string): string {
  const separator = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${separator}theme=dark`
}

interface CollectDataIframeProps {
  url: string
  onComplete: () => void
  onError: (error: string) => void
}

export default function CollectDataIframe({
  url,
  onComplete,
  onError,
}: CollectDataIframeProps) {
  const popupRef = useRef<Window | null>(null)
  const [opened, setOpened] = useState(false)

  const finalUrl = buildUrlWithTheme(url)

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const isAllowedOrigin = WHITELISTED_ORIGINS.some(
        origin => event.origin === origin
      )
      if (!isAllowedOrigin) return

      try {
        const message = typeof event.data === 'string'
          ? JSON.parse(event.data)
          : event.data

        if (message.type === 'IC_COMPLETE' && message.success) {
          popupRef.current?.close()
          popupRef.current = null
          onComplete()
        } else if (message.type === 'IC_ERROR' || !message.success) {
          popupRef.current?.close()
          popupRef.current = null
          onError(message.error || 'Form submission failed')
        }
      } catch {
        // Non-JSON message, ignore
      }
    },
    [onComplete, onError],
  )

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  useEffect(() => {
    if (!opened || !popupRef.current) return

    const interval = setInterval(() => {
      if (popupRef.current?.closed) {
        popupRef.current = null
        setOpened(false)
      }
    }, 500)

    return () => clearInterval(interval)
  }, [opened])

  useEffect(() => {
    return () => {
      popupRef.current?.close()
    }
  }, [])

  const openPopup = useCallback(() => {
    const width = 480
    const height = 700
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    popupRef.current = window.open(
      finalUrl,
      'walletconnect_pay_collect',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    )

    if (popupRef.current) {
      setOpened(true)
      popupRef.current.focus()
    } else {
      onError('Popup blocked. Please allow popups for this site.')
    }
  }, [finalUrl, onError])

  if (opened) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
        textAlign: 'center',
        gap: '16px',
      }}>
        <Loading size="xl" color="primary" />
        <Text h4 css={{ marginTop: '8px' }}>
          Complete verification
        </Text>
        <Text css={{ color: '$accents6', fontSize: '14px' }}>
          Complete the form in the opened window. This page will update automatically.
        </Text>
        <button
          onClick={() => popupRef.current ? popupRef.current.focus() : openPopup()}
          style={{
            marginTop: '8px',
            padding: '10px 20px',
            backgroundColor: 'transparent',
            color: '#0094FF',
            border: '1px solid #0094FF',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <OpenInNewIcon sx={{ fontSize: 16 }} />
          Bring window to front
        </button>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px',
      textAlign: 'center',
      gap: '16px',
    }}>
      <Text h4>Why we need your information?</Text>
      <Text css={{ color: '$accents6', fontSize: '14px', lineHeight: '1.6', textAlign: 'left' }}>
        For regulatory compliance, we collect basic information on your first
        payment: full name, date of birth, and place of birth.
      </Text>
      <Text css={{ color: '$accents6', fontSize: '14px', lineHeight: '1.6', textAlign: 'left' }}>
        This information is tied to your wallet address and this specific
        network. If you use the same wallet on this network again, you won&apos;t
        need to provide it again.
      </Text>
      <button
        onClick={openPopup}
        style={{
          marginTop: '8px',
          width: '100%',
          padding: '16px',
          backgroundColor: '#0094FF',
          color: 'white',
          border: 'none',
          borderRadius: '16px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <OpenInNewIcon sx={{ fontSize: 18 }} />
        Open verification form
      </button>
    </div>
  )
}
