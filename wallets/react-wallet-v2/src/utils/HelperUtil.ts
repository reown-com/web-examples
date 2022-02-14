/**
 * Truncates string (in the middle) via given lenght value
 */
export function truncate(value: string, length: number) {
  if (value.length <= length) {
    return value
  }

  const separator = '...'
  const stringLength = length - separator.length
  const frontLength = Math.ceil(stringLength / 2)
  const backLength = Math.floor(stringLength / 2)

  return value.substring(0, frontLength) + separator + value.substring(value.length - backLength)
}

/**
 * Helps to get message from various sign methods present in eth
 * @details https://docs.metamask.io/guide/signing-data.html#a-brief-history
 */
export function getSignMessage(params: string[], walletAddress: string) {
  // Remove our own address from params, so we are left with message
  params.filter(p => p !== walletAddress)

  return params[0]
}
