import { parseUnits } from 'viem'

/** Amount in human units, e.g. `1` or `1.5` */
export const AMOUNT_PATTERN = /^\d+(\.\d+)?$/

/**
 * Why a human-readable amount cannot be sent for a token with `decimals`, or
 * `undefined` when it can. Kept free of app imports so `scripts/test-erc20-amount.js`
 * can load it directly.
 */
export function getAmountError(amount: string, decimals: number): string | undefined {
  if (!AMOUNT_PATTERN.test(amount)) {
    return `Invalid amount: ${amount}`
  }

  /* parseUnits silently rounds extra fractional digits (1.0000005 USDC would be
     sent as 1.000001), so reject them instead of moving money the user did not type. */
  const fraction = amount.split('.')[1] ?? ''
  if (fraction.length > decimals) {
    return `Amount has ${fraction.length} decimal places, token supports at most ${decimals}`
  }

  if (!/[1-9]/.test(amount)) {
    return 'Amount must be greater than zero'
  }

  return undefined
}

/** Parse a validated human-readable amount into base units. Throws on any validation error. */
export function parseErc20Amount(amount: string, decimals: number): bigint {
  const error = getAmountError(amount, decimals)
  if (error) {
    throw new Error(error)
  }

  return parseUnits(amount, decimals)
}
