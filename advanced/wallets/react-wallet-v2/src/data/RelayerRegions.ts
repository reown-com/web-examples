/**
 * Types
 */

type RelayerType = {
  value: string
  label: string
}

/**
 * Relayer Regions
 */
export const REGIONALIZED_RELAYER_ENDPOINTS: RelayerType[] = [
  {
    value: 'wss://staging-relay.walletconnect.com',
    label: 'Default (Staging)'
  },

  {
    value: 'wss://us-east-1.relay.walletconnect.com',
    label: 'US'
  },
  {
    value: 'wss://eu-central-1.relay.walletconnect.com',
    label: 'EU'
  },
  {
    value: 'wss://ap-southeast-1.relay.walletconnect.com',
    label: 'Asia Pacific'
  },
  {
    value: 'wss://relay.walletconnect.com',
    label: 'Production'
  }
]
