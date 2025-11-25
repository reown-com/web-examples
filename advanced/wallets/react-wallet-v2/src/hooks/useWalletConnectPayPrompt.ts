import { useEffect, useRef } from 'react'
import { useSnapshot } from 'valtio'
import SettingsStore from '@/store/SettingsStore'
import ModalStore from '@/store/ModalStore'

const PROMPT_DISMISSED_KEY = 'WALLETCONNECT_PAY_PROMPT_DISMISSED'

/**
 * Hook to show WalletConnect Pay prompt on first load if not enabled
 */
export default function useWalletConnectPayPrompt(initialized: boolean) {
  const { walletConnectPayEnabled } = useSnapshot(SettingsStore.state)
  const hasShownPrompt = useRef(false)

  useEffect(() => {
    // Only run once after initialization
    if (!initialized || hasShownPrompt.current) {
      return
    }

    // Check if WalletConnect Pay is already enabled
    if (walletConnectPayEnabled) {
      return
    }

    // Check if user has already dismissed the prompt before
    const dismissed = localStorage.getItem(PROMPT_DISMISSED_KEY)
    if (dismissed === 'true') {
      return
    }

    // Show the prompt modal after a short delay to let the app fully load
    const timer = setTimeout(() => {
      hasShownPrompt.current = true
      ModalStore.open('WalletConnectPayPromptModal', {}, () => {
        // On close, if not enabled, mark as dismissed so we don't show again
        if (!SettingsStore.state.walletConnectPayEnabled) {
          localStorage.setItem(PROMPT_DISMISSED_KEY, 'true')
        }
      })
    }, 1500)

    return () => clearTimeout(timer)
  }, [initialized, walletConnectPayEnabled])
}
