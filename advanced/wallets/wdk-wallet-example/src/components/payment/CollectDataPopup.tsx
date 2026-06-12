import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Some payment options require collecting buyer data (e.g. KYC for first
 * payment). The Pay API returns a hosted form URL; we open it in a popup and
 * listen for the completion postMessage.
 */
const WHITELISTED_ORIGINS = [
  'https://dev.pay.walletconnect.com',
  'https://staging.pay.walletconnect.com',
  'https://pay.walletconnect.com'
]

function withDarkTheme(url: string) {
  return `${url}${url.includes('?') ? '&' : '?'}theme=dark`
}

interface Props {
  url: string
  onComplete: () => void
  onError: (error: string) => void
}

export default function CollectDataPopup({ url, onComplete, onError }: Props) {
  const popupRef = useRef<Window | null>(null)
  const [opened, setOpened] = useState(false)

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (!WHITELISTED_ORIGINS.includes(event.origin)) return
      try {
        const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
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
        // ignore non-JSON messages
      }
    },
    [onComplete, onError]
  )

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  useEffect(() => () => popupRef.current?.close(), [])

  const openPopup = useCallback(() => {
    const width = 480
    const height = 700
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2
    popupRef.current = window.open(
      withDarkTheme(url),
      'walletconnect_pay_collect',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    )
    if (popupRef.current) {
      setOpened(true)
      popupRef.current.focus()
    } else {
      onError('Popup blocked. Please allow popups for this site.')
    }
  }, [url, onError])

  return (
    <div className="pay-center">
      <h2>Verification required</h2>
      <p className="muted">
        For regulatory compliance, the first payment on this network collects basic information.
        Complete the form in the opened window — this page updates automatically.
      </p>
      <button className="pay-primary" onClick={() => (opened ? popupRef.current?.focus() : openPopup())}>
        {opened ? 'Bring window to front' : 'Open verification form'}
      </button>
    </div>
  )
}
