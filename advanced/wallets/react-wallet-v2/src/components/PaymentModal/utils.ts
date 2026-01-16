export type PaymentState = 'loading' | 'intro' | 'error' | 'collect_data' | 'options' | 'confirming' | 'success'

export interface FormStepConfig {
  title: string
  fields: Array<{ id: string; name: string; fieldType: string; required?: boolean }>
}

export function formatAmount(value: string, decimals: number, maxDecimals = 6): string {
  const num = BigInt(value)
  const divisor = BigInt(10 ** decimals)
  const integerPart = num / divisor
  const fractionalPart = num % divisor

  if (fractionalPart === BigInt(0)) {
    return integerPart.toString()
  }

  let fractionalStr = fractionalPart.toString().padStart(decimals, '0')
  fractionalStr = fractionalStr.replace(/0+$/, '')

  if (fractionalStr.length > maxDecimals) {
    fractionalStr = fractionalStr.substring(0, maxDecimals)
  }

  return `${integerPart}.${fractionalStr}`
}

export function formatEta(seconds: number): string {
  if (seconds < 60) return `~${seconds}s`
  const minutes = Math.round(seconds / 60)
  return `~${minutes}m`
}

export function formatDateInput(value: string): string {
  const cleaned = value.replace(/[^0-9]/g, '')
  if (cleaned.length <= 4) return cleaned
  if (cleaned.length <= 6) return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`
}

export function isValidDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    year >= 1900
  )
}

export function groupFieldsIntoSteps(
  fields: Array<{ id: string; name: string; fieldType: string; required?: boolean }>
): FormStepConfig[] {
  const steps: FormStepConfig[] = []

  // Group name fields together
  const nameFields = fields.filter(
    f => f.id.toLowerCase().includes('name') || f.name.toLowerCase().includes('name')
  )
  if (nameFields.length > 0) {
    steps.push({ title: "What's your name?", fields: nameFields })
  }

  // Date of birth as separate step
  const dobFields = fields.filter(
    f =>
      f.fieldType === 'date' ||
      f.id.toLowerCase().includes('birth') ||
      f.id.toLowerCase().includes('dob') ||
      f.name.toLowerCase().includes('birth') ||
      f.name.toLowerCase().includes('date')
  )
  if (dobFields.length > 0) {
    steps.push({ title: "What's your date of birth?", fields: dobFields })
  }

  // Any remaining fields
  const usedIds = new Set([...nameFields.map(f => f.id), ...dobFields.map(f => f.id)])
  const otherFields = fields.filter(f => !usedIds.has(f.id))
  if (otherFields.length > 0) {
    steps.push({ title: 'Additional information', fields: otherFields })
  }

  return steps
}
