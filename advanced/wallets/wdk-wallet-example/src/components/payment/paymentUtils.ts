import type { IWalletKitPay } from '@reown/walletkit'

/**
 * Pay types, derived from the WalletKit Pay client interface so we don't need a
 * direct dependency on @walletconnect/pay.
 */
export type PaymentOptionsResponse = Awaited<ReturnType<IWalletKitPay['getPaymentOptions']>>
export type PaymentOption = PaymentOptionsResponse['options'][number]
export type PaymentInfo = NonNullable<PaymentOptionsResponse['info']>
export type Action = Awaited<ReturnType<IWalletKitPay['getRequiredPaymentActions']>>[number]

export type Step = 'loading' | 'collectData' | 'confirm' | 'confirming' | 'result'

export type ErrorType = 'insufficient_funds' | 'expired' | 'not_found' | 'generic'

/** Formats a base-unit amount (string) into a human-readable decimal string. */
export function formatAmount(value: string, decimals: number, minDecimals = 0): string {
  const num = BigInt(value)
  const divisor = BigInt(10) ** BigInt(decimals)
  const integerPart = num / divisor
  const fractionalPart = num % divisor

  if (fractionalPart === BigInt(0)) {
    return minDecimals > 0 ? `${integerPart}.${'0'.repeat(minDecimals)}` : integerPart.toString()
  }

  const fractionalStr = fractionalPart.toString().padStart(decimals, '0')
  let trimmed = fractionalStr.replace(/0+$/, '')
  if (trimmed.length < minDecimals) trimmed = trimmed.padEnd(minDecimals, '0')
  return `${integerPart}.${trimmed}`
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  KRW: '₩',
  INR: '₹',
  BRL: 'R$',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF'
}

export function getCurrencySymbol(currencyCode?: string): string {
  if (!currencyCode) return '$'
  return CURRENCY_SYMBOLS[currencyCode.toUpperCase()] || currencyCode
}

export function detectErrorType(message: string): ErrorType {
  const msg = message.toLowerCase()
  if (msg.includes('insufficient') || msg.includes('balance') || msg.includes('funds')) {
    return 'insufficient_funds'
  }
  if (msg.includes('expired') || msg.includes('timeout')) return 'expired'
  if (msg.includes('not found') || msg.includes('404')) return 'not_found'
  return 'generic'
}

export function getErrorTitle(errorType: ErrorType): string {
  switch (errorType) {
    case 'insufficient_funds':
      return 'Not enough funds'
    case 'expired':
      return 'Payment expired'
    case 'not_found':
      return 'Payment not found'
    default:
      return 'Transaction failed'
  }
}

export function getErrorMessage(errorType: ErrorType, originalMessage?: string): string {
  switch (errorType) {
    case 'insufficient_funds':
      return "You don't have enough crypto to complete this payment."
    case 'expired':
      return 'This payment took too long to approve and has expired.'
    case 'not_found':
      return 'This payment link is not valid or has already been completed.'
    default:
      return originalMessage || "The network couldn't complete this transaction."
  }
}
