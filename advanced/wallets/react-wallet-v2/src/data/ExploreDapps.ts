/**
 * Dapp Picker POC — Explore tab registry (hardcoded).
 *
 * The "picker illusion": all four tiles open the SAME react-dapp-v2 deployment
 * with a different `?aggregator=` preset. Shaped like a future registry entry
 * so a real directory could drop straight in.
 *
 * Corner cut: hardcoded array + placeholder (emoji) icons, no remote registry.
 */

export type EmbedMode = 'iframe' | 'popup'

export interface ExploreDapp {
  id: string
  name: string
  /** Placeholder icon: an emoji rendered in a colored avatar. */
  icon: string
  /** Avatar background so the tiles read as distinct. */
  color: string
  /** Base dapp URL. The full picker contract is appended when opened. */
  url: string
  /** Aggregator preset passed as `?aggregator=`. */
  aggregator: 'jupiter' | 'oneinch' | 'kyberswap' | 'uniswap'
  /** How the wallet embeds it. iframe is primary; popup is the fallback. */
  embed: EmbedMode
}

/**
 * Single deployment behind every tile. Defaults to THIS branch's dapp preview
 * (which carries the Phase 2 web transport in `offerUriToHost`); the older
 * session-fees-poc preview does not have it. Override for local E2E via
 * NEXT_PUBLIC_EXPLORE_DAPP_URL (e.g. http://localhost:3000).
 */
export const EXPLORE_DAPP_BASE_URL =
  process.env.NEXT_PUBLIC_EXPLORE_DAPP_URL ||
  'https://react-dapp-v2-git-dapp-picker-web-poc-reown-com.vercel.app'

export const EXPLORE_DAPPS: ExploreDapp[] = [
  {
    id: 'jupiter',
    name: 'Jupiter',
    icon: '🪐',
    color: '#5c4b8a',
    url: EXPLORE_DAPP_BASE_URL,
    aggregator: 'jupiter',
    embed: 'iframe'
  },
  {
    id: 'oneinch',
    name: '1inch',
    icon: '🦄',
    color: '#1b314f',
    url: EXPLORE_DAPP_BASE_URL,
    aggregator: 'oneinch',
    embed: 'iframe'
  },
  {
    id: 'kyberswap',
    name: 'KyberSwap',
    icon: '💠',
    color: '#0b6e5f',
    url: EXPLORE_DAPP_BASE_URL,
    aggregator: 'kyberswap',
    embed: 'iframe'
  },
  {
    id: 'uniswap',
    name: 'Uniswap',
    icon: '🦄',
    color: '#7a1f52',
    url: EXPLORE_DAPP_BASE_URL,
    aggregator: 'uniswap',
    embed: 'iframe'
  }
]

/**
 * Build the full picker URL contract for a tile:
 *   ?wc_auto=1&aggregator=…&connect=…&host_origin=…
 */
export function buildPickerUrl(
  dapp: ExploreDapp,
  variant: 'headless' | 'provider',
  hostOrigin: string
): string {
  const u = new URL(dapp.url)
  u.searchParams.set('wc_auto', '1')
  u.searchParams.set('aggregator', dapp.aggregator)
  u.searchParams.set('connect', variant)
  u.searchParams.set('host_origin', hostOrigin)
  return u.toString()
}

/** The origin the wallet expects `wc_session_offer` messages to come from. */
export function dappOrigin(dapp: ExploreDapp): string {
  return new URL(dapp.url).origin
}
