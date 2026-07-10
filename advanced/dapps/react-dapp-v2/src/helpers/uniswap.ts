/**
 * Session Fees POC helpers: Uniswap Trading API client (Arbitrum One).
 * Docs: https://developers.uniswap.org/docs/api-reference (trade-api.gateway.uniswap.org/v1)
 *
 * Requires a self-serve API key; requests go through the dapp's /api/uniswap
 * proxy so the key stays server-side (UNISWAP_API_KEY).
 *
 * Fee-gating: verified NOT gated (2026-07-10) — a fresh self-serve key
 * applies `integratorFees`; the split is reported in the quote's
 * `aggregatedOutputs` (the `fee: true` entry is the integrator fee).
 */

export const UNISWAP_ARBITRUM_CAIP = "eip155:42161";
const CHAIN_ID = 42161;

// The Trading API uses the zero address for the native token.
export const UNISWAP_NATIVE_ETH = "0x0000000000000000000000000000000000000000";
export const UNISWAP_ARBITRUM_USDC =
  "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

// integratorFees[].bips is capped at 500 (5%) by the API.
export const UNISWAP_MAX_FEE_BPS = 500;

const PROXY_BASE = "/api/uniswap";

export interface UniswapAggregatedOutput {
  amount: string;
  token: string;
  recipient: string;
  bps: number;
  fee: boolean;
  minAmount?: string;
}

export interface UniswapQuote {
  output?: { amount?: string };
  /** Output split incl. the integrator fee (`fee: true` entry). */
  aggregatedOutputs?: UniswapAggregatedOutput[];
  priceImpact?: number;
  [key: string]: unknown;
}

export interface UniswapQuoteResponse {
  requestId: string;
  routing: string;
  quote: UniswapQuote;
}

export interface UniswapTxRequest {
  to: string;
  from: string;
  data: string;
  value: string;
  chainId: number;
  gasLimit?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
}

async function uniswapFetch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${PROXY_BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(
      `Uniswap ${path} failed (${res.status}): ${await res.text()}`,
    );
  }
  return res.json();
}

export async function getUniswapQuote(params: {
  amount: string; // wei
  swapper: string;
  feeBps?: number;
  feeRecipient?: string;
  slippagePercent?: number;
}): Promise<UniswapQuoteResponse> {
  return uniswapFetch("quote", {
    type: "EXACT_INPUT",
    amount: params.amount,
    tokenInChainId: CHAIN_ID,
    tokenOutChainId: CHAIN_ID,
    tokenIn: UNISWAP_NATIVE_ETH,
    tokenOut: UNISWAP_ARBITRUM_USDC,
    swapper: params.swapper,
    slippageTolerance: params.slippagePercent ?? 0.5,
    // Whitelisting the classic AMM protocols guarantees a transaction-based
    // route (UniswapX routes return signed orders instead of transactions).
    protocols: ["V2", "V3", "V4"],
    ...(params.feeBps && params.feeRecipient
      ? {
          integratorFees: [
            { bips: params.feeBps, recipient: params.feeRecipient },
          ],
        }
      : {}),
  });
}

export async function buildUniswapSwap(params: {
  quote: UniswapQuote;
}): Promise<{ swap: UniswapTxRequest }> {
  return uniswapFetch("swap", {
    quote: params.quote,
    simulateTransaction: false,
  });
}

/** Converts a Trading API tx request into eth_sendTransaction params. */
export function uniswapToWalletConnectTx(tx: UniswapTxRequest) {
  const toHex = (value?: string) =>
    value === undefined
      ? undefined
      : value.startsWith("0x")
        ? value
        : `0x${BigInt(value).toString(16)}`;
  return {
    from: tx.from,
    to: tx.to,
    data: tx.data,
    value: toHex(tx.value) ?? "0x0",
    ...(tx.gasLimit ? { gasLimit: toHex(tx.gasLimit) } : {}),
  };
}
