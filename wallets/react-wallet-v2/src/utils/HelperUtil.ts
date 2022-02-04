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
