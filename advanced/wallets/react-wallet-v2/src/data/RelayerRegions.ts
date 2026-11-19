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
    // The dev Relay, over the WebSocket, so this app can pair with the ones on Sign v2 over HTTP
    // and Sign v3, which only that Relay serves so far.
    value: 'wss://pool-1.dev-relay.walletconnect.com',
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
