/**
 * Session Fees POC helpers: 1inch Classic Swap API v6 client (Arbitrum One).
 * Docs: https://business.1inch.com/portal/documentation/apis/swap/classic-swap
 *
 * Calls go through the dapp's own /api/oneinch proxy (see
 * src/pages/api/oneinch/[...path].ts) because api.1inch.dev requires an
 * Authorization header and does not allow browser CORS.
 */

export const ARBITRUM_CAIP = "eip155:42161";
export const ARBITRUM_CHAIN_ID = 42161;

// 1inch pseudo-address for the native token.
export const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
export const ARBITRUM_USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
export const ETH_DECIMALS = 18;

// 1inch Classic Swap caps the partner fee at 3% (the `fee` param is a percent).
export const ONEINCH_MAX_FEE_BPS = 300;

const PROXY_BASE = "/api/oneinch";
const SWAP_BASE = `swap/v6.0/${ARBITRUM_CHAIN_ID}`;

export interface OneInchTx {
  from: string;
  to: string;
  data: string;
  value: string;
  gas?: number;
  gasPrice?: string;
}

function withFee(
  query: URLSearchParams,
  feeBps?: number,
  referrer?: string,
): URLSearchParams {
  // fee + referrer must be passed together, and identically on /quote and /swap.
  if (feeBps && referrer) {
    query.set("fee", String(feeBps / 100));
    query.set("referrer", referrer);
  }
  return query;
}

async function oneInchFetch<T>(
  path: string,
  query: URLSearchParams,
): Promise<T> {
  const res = await fetch(`${PROXY_BASE}/${path}?${query}`);
  if (!res.ok) {
    throw new Error(
      `1inch request failed (${res.status}): ${await res.text()}`,
    );
  }
  return res.json();
}

export async function getOneInchQuote(params: {
  amount: string; // wei
  feeBps?: number;
  referrer?: string;
}): Promise<{ dstAmount: string }> {
  const query = withFee(
    new URLSearchParams({
      src: ETH_ADDRESS,
      dst: ARBITRUM_USDC,
      amount: params.amount,
    }),
    params.feeBps,
    params.referrer,
  );
  return oneInchFetch(`${SWAP_BASE}/quote`, query);
}

export async function buildOneInchSwap(params: {
  amount: string; // wei
  from: string;
  feeBps?: number;
  referrer?: string;
  slippagePercent?: number;
}): Promise<{ dstAmount: string; tx: OneInchTx }> {
  const query = withFee(
    new URLSearchParams({
      src: ETH_ADDRESS,
      dst: ARBITRUM_USDC,
      amount: params.amount,
      from: params.from,
      origin: params.from,
      slippage: String(params.slippagePercent ?? 0.5),
    }),
    params.feeBps,
    params.referrer,
  );
  return oneInchFetch(`${SWAP_BASE}/swap`, query);
}

/** Converts a 1inch tx object into eth_sendTransaction params (hex values). */
export function toWalletConnectTx(tx: OneInchTx) {
  return {
    from: tx.from,
    to: tx.to,
    data: tx.data,
    value: `0x${BigInt(tx.value || "0").toString(16)}`,
    ...(tx.gas ? { gasLimit: `0x${BigInt(tx.gas).toString(16)}` } : {}),
  };
}

/**
 * Cosmetic price cards for the 1inch/Arbitrum mode (CoinGecko public API;
 * callers should tolerate failures).
 */
export async function getEvmPrices(): Promise<
  Record<string, { usdPrice: number; priceChange24h?: number }>
> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,usd-coin&vs_currencies=usd&include_24hr_change=true",
  );
  if (!res.ok) throw new Error(`CoinGecko request failed (${res.status})`);
  const data = await res.json();
  return {
    ETH: {
      usdPrice: data.ethereum?.usd,
      priceChange24h: data.ethereum?.usd_24h_change,
    },
    USDC: {
      usdPrice: data["usd-coin"]?.usd,
      priceChange24h: data["usd-coin"]?.usd_24h_change,
    },
  };
}
