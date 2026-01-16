import { WalletConnectPay } from '@walletconnect/pay'
import type { WalletConnectPayOptions } from '@walletconnect/pay'

type WalletConnectPayInstance = InstanceType<typeof WalletConnectPay>

// Store client outside proxy (class instances don't work well with proxies)
let clientInstance: WalletConnectPayInstance | null = null

const PayStore = {
  initialize(options: WalletConnectPayOptions) {
    if (!WalletConnectPay.isAvailable()) {
      console.warn('[PayStore] Pay SDK provider not available')
      return
    }
    try {
      clientInstance = new WalletConnectPay(options)
      console.log('[PayStore] Pay SDK initialized successfully')
    } catch (error) {
      console.error('[PayStore] Failed to initialize Pay SDK:', error)
      clientInstance = null
    }
  },

  getClient(): WalletConnectPayInstance | null {
    return clientInstance
  },

  isAvailable(): boolean {
    return clientInstance !== null
  }
}

export default PayStore
