/**
 * Session Fees POC helpers: KyberSwap Aggregator API client (Arbitrum One).
 * Docs: https://docs.kyberswap.com/developer-guide/aggregator-api/aggregator-api-specification/evm-swaps
 *
 * Fully permissionless: no API key, browser CORS is open (no proxy needed);
 * `x-client-id` is a self-chosen identifier that only affects rate limits.
 */

// Same chain/tokens as the 1inch integration, duplicated on purpose so each
// aggregator module stays self-contained.
export const KYBER_ARBITRUM_CAIP = "eip155:42161";
export const KYBER_ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
export const KYBER_ARBITRUM_USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

// KyberSwap documents no protocol cap on the fee (only "fee <= amount" API
// errors); clamp defensively in the dapp.
export const KYBER_MAX_FEE_BPS = 1000;

const API_BASE = "https://aggregator-api.kyberswap.com/arbitrum/api/v1";
const CLIENT_ID = "session-fees-poc";

const HEADERS = { "x-client-id": CLIENT_ID };

export interface KyberRouteSummary {
  amountIn: string;
  amountOut: string;
  extraFee?: {
    feeAmount: string;
    chargeFeeBy: string;
    isInBps: boolean;
    feeReceiver: string;
  };
  [key: string]: unknown;
}

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(
      `KyberSwap request failed (${res.status}): ${await res.text()}`,
    );
  }
  const body = await res.json();
  if (body.code !== 0) {
    throw new Error(`KyberSwap error (${body.code}): ${body.message}`);
  }
  return body.data;
}

/**
 * GET /routes — fee params are baked into the returned routeSummary
 * (`extraFee`) and amountOut is already net of the fee.
 */
export async function getKyberRoute(params: {
  amount: string; // wei
  feeBps?: number;
  feeReceiver?: string;
}): Promise<{ routeSummary: KyberRouteSummary; routerAddress: string }> {
  const query = new URLSearchParams({
    tokenIn: KYBER_ETH_ADDRESS,
    tokenOut: KYBER_ARBITRUM_USDC,
    amountIn: params.amount,
  });
  if (params.feeBps && params.feeReceiver) {
    query.set("feeAmount", String(params.feeBps));
    query.set("chargeFeeBy", "currency_out");
    query.set("isInBps", "true");
    query.set("feeReceiver", params.feeReceiver);
  }
  const res = await fetch(`${API_BASE}/routes?${query}`, { headers: HEADERS });
  return unwrap(res);
}

/**
 * POST /route/build — turns a routeSummary into router calldata. The fee
 * transfer to `extraFee.feeReceiver` is part of the calldata.
 */
export async function buildKyberSwap(params: {
  routeSummary: KyberRouteSummary;
  sender: string;
  slippageBps?: number;
}): Promise<{
  data: string;
  routerAddress: string;
  transactionValue: string;
  amountOut: string;
  gas: string;
}> {
  const res = await fetch(`${API_BASE}/route/build`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...HEADERS },
    body: JSON.stringify({
      routeSummary: params.routeSummary,
      sender: params.sender,
      recipient: params.sender,
      slippageTolerance: params.slippageBps ?? 50,
      source: CLIENT_ID,
    }),
  });
  return unwrap(res);
}

/** Converts a route/build result into eth_sendTransaction params. */
export function kyberToWalletConnectTx(
  from: string,
  build: {
    routerAddress: string;
    data: string;
    transactionValue: string;
    gas: string;
  },
) {
  // Kyber's gas estimate can run tight; give it 50% headroom.
  const gasLimit = (BigInt(build.gas || "0") * 15n) / 10n;
  return {
    from,
    to: build.routerAddress,
    data: build.data,
    value: `0x${BigInt(build.transactionValue || "0").toString(16)}`,
    ...(gasLimit > 0n ? { gasLimit: `0x${gasLimit.toString(16)}` } : {}),
  };
}
