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
    // The dev Relay: the only one that serves Sign v2 over HTTP so far. NEXT_PUBLIC_RELAY_URL is
    // not read: where it is set, it names a Relay that serves the WebSocket only.
    value: process.env.NEXT_PUBLIC_HTTP_RELAY_URL || 'https://pool-1.dev-relay.walletconnect.com',
    label: 'Default'
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
  }
]
