/**
 * Session Fees POC: parsing of the wallet-declared fee terms carried in
 * sessionProperties.wc_feeTerms (JSON-encoded string).
 */

export interface FeeTerms {
  version: number;
  /** Solana fee recipient (owner address; aggregators collect into its ATA). */
  feeRecipient?: string;
  /** EVM fee recipient (plain EOA). */
  feeRecipientEip155?: string;
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
      typeof parsed?.feeBps !== "number" ||
      !Number.isFinite(parsed.feeBps) ||
      parsed.feeBps <= 0
    ) {
      return undefined;
    }
    const feeRecipient =
      typeof parsed.feeRecipient === "string" ? parsed.feeRecipient : undefined;
    const feeRecipientEip155 =
      typeof parsed.feeRecipientEip155 === "string" &&
      /^0x[a-fA-F0-9]{40}$/.test(parsed.feeRecipientEip155)
        ? parsed.feeRecipientEip155
        : undefined;
    if (!feeRecipient && !feeRecipientEip155) return undefined;
    return {
      version: Number(parsed.version) || 1,
      feeRecipient,
      feeRecipientEip155,
      feeBps: Math.floor(parsed.feeBps),
    };
  } catch (e) {
    console.warn("Failed to parse wc_feeTerms:", raw, e);
    return undefined;
  }
}
