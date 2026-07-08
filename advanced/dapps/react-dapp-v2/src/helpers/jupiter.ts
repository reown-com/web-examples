import { PublicKey } from "@solana/web3.js";

/**
 * Session Fees POC helpers: Jupiter Swap API (V1) client + wc_feeTerms parsing.
 * Docs: https://developers.jup.ag/docs/swap/v1
 */

export const SOLANA_MAINNET_CAIP = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";

export const SOL_MINT = "So11111111111111111111111111111111111111112";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const SOL_DECIMALS = 9;
export const USDC_DECIMALS = 6;

// Jupiter's v6 swap program stores platformFeeBps as a u8 on-chain — clamp to 255.
export const JUPITER_MAX_FEE_BPS = 255;

const JUPITER_API_KEY = process.env.NEXT_PUBLIC_JUPITER_API_KEY;
// Keyless requests go to lite-api.jup.ag (scheduled for deprecation, date TBA);
// with an API key from portal.jup.ag we use the canonical api.jup.ag host.
const JUPITER_API_BASE =
  process.env.NEXT_PUBLIC_JUPITER_API_BASE ||
  (JUPITER_API_KEY ? "https://api.jup.ag" : "https://lite-api.jup.ag");

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
);

/**
 * wc_feeTerms — fee terms declared by the wallet in sessionProperties.
 */
export interface FeeTerms {
  version: number;
  feeRecipient: string;
  feeBps: number;
}

export function parseFeeTerms(
  sessionProperties?: Record<string, string | undefined>,
): FeeTerms | undefined {
  const raw = sessionProperties?.["wc_feeTerms"];
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.feeRecipient !== "string" ||
      typeof parsed?.feeBps !== "number" ||
      !Number.isFinite(parsed.feeBps) ||
      parsed.feeBps <= 0
    ) {
      return undefined;
    }
    // Throws if the recipient is not a valid Solana address.
    new PublicKey(parsed.feeRecipient);
    return {
      version: Number(parsed.version) || 1,
      feeRecipient: parsed.feeRecipient,
      feeBps: Math.floor(parsed.feeBps),
    };
  } catch (e) {
    console.warn("Failed to parse wc_feeTerms:", raw, e);
    return undefined;
  }
}

/**
 * Derives the associated token account for owner+mint without pulling in
 * @solana/spl-token. Jupiter takes the integrator fee straight into this
 * account when it is passed as `feeAccount` on /swap.
 */
export function getAssociatedTokenAddress(
  owner: string,
  mint: string,
): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [
      new PublicKey(owner).toBytes(),
      TOKEN_PROGRAM_ID.toBytes(),
      new PublicKey(mint).toBytes(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  return ata;
}

export interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  priceImpactPct: string;
  platformFee?: { amount: string; feeBps: number } | null;
  [key: string]: unknown;
}

function jupiterHeaders(): HeadersInit {
  return JUPITER_API_KEY ? { "x-api-key": JUPITER_API_KEY } : {};
}

export async function getJupiterQuote(params: {
  inputMint: string;
  outputMint: string;
  amount: string;
  platformFeeBps?: number;
  slippageBps?: number;
}): Promise<JupiterQuote> {
  const query = new URLSearchParams({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: params.amount,
    slippageBps: String(params.slippageBps ?? 50),
  });
  if (params.platformFeeBps) {
    query.set("platformFeeBps", String(params.platformFeeBps));
  }
  const res = await fetch(`${JUPITER_API_BASE}/swap/v1/quote?${query}`, {
    headers: jupiterHeaders(),
  });
  if (!res.ok) {
    throw new Error(
      `Jupiter quote failed (${res.status}): ${await res.text()}`,
    );
  }
  return res.json();
}

export async function buildJupiterSwapTransaction(params: {
  quoteResponse: JupiterQuote;
  userPublicKey: string;
  feeAccount?: string;
}): Promise<{ swapTransaction: string; lastValidBlockHeight: number }> {
  const res = await fetch(`${JUPITER_API_BASE}/swap/v1/swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...jupiterHeaders() },
    body: JSON.stringify({
      quoteResponse: params.quoteResponse,
      userPublicKey: params.userPublicKey,
      feeAccount: params.feeAccount,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: "auto",
    }),
  });
  if (!res.ok) {
    throw new Error(`Jupiter swap failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

/**
 * Jupiter Price API V3. Returns usd prices by mint; best-effort (callers
 * should tolerate failures — the cards are cosmetic).
 */
export async function getJupiterPrices(
  mints: string[],
): Promise<Record<string, { usdPrice: number; priceChange24h?: number }>> {
  const res = await fetch(
    `${JUPITER_API_BASE}/price/v3?ids=${mints.join(",")}`,
    { headers: jupiterHeaders() },
  );
  if (!res.ok) {
    throw new Error(`Jupiter price failed (${res.status})`);
  }
  return res.json();
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function formatTokenAmount(
  rawAmount: string | number,
  decimals: number,
  displayDecimals = 6,
): string {
  const amount = Number(rawAmount) / 10 ** decimals;
  if (!Number.isFinite(amount)) return "0";
  return amount.toLocaleString("en-US", {
    maximumFractionDigits: displayDecimals,
  });
}
