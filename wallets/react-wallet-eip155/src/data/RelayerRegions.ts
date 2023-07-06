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
    value: 'wss://relay.walletconnect.com',
    label: 'Default'
  },
  {
    value: 'wss://us-east-1.relay.walletconnect.com/',
    label: 'US'
  },
  {
    value: 'wss://eu-central-1.relay.walletconnect.com/',
    label: 'EU'
  },
  {
    value: 'wss://ap-southeast-1.relay.walletconnect.com/',
    label: 'Asia Pacific'
  }
]
