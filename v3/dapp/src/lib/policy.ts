// What Nimbus's signing backend (pages/api/wc-attestation.ts) agrees to sign. It signs what the app
// meant to do, not whatever its frontend asks: a compromised frontend can only ask for these.
import { NIMBUS_CONTRACTS, TRANSFER } from './common'

const APPROVE = '0x095ea7b3'

/** A connection: the Sign v2 proposal or the Sign v3 session create. */
export const CONNECT_METHODS = ['wc_sessionPropose', 'wc_sessionCreate']
/** Other session messages Nimbus sends that carry no request: Sign v3 signs its pings. */
const SESSION_MESSAGES = ['wc_sessionPing']
/** The wallet methods Nimbus asks for. */
export const ALLOWED_METHODS = ['personal_sign', 'eth_signTypedData_v4', 'eth_sendTransaction']

const isAddress = (a: unknown): a is string =>
  typeof a === 'string' && /^0x[0-9a-fA-F]{40}$/.test(a)
const lower = (a: string) => a.toLowerCase()
const isNimbus = (a: string) => NIMBUS_CONTRACTS.includes(lower(a))

/** Fields that name who gets value in typed data such as an EIP-2612 permit. */
const RECIPIENT_FIELDS = ['to', 'recipient', 'spender', 'receiver', 'operator']

/**
 * Why the backend won't sign this JSON-RPC message, or undefined to sign it. `rpc` must be parsed
 * from the very string the JWT's `sub` hashes.
 */
export function refusal(rpc: unknown): string | undefined {
  const m = rpc as { method?: unknown; params?: any }
  if (typeof m?.method !== 'string') return 'not a JSON-RPC request'
  if (CONNECT_METHODS.includes(m.method) || SESSION_MESSAGES.includes(m.method)) return
  if (m.method !== 'wc_sessionRequest') return `Nimbus doesn't send ${m.method}`
  const { method, params } = m.params?.request ?? {}
  if (!ALLOWED_METHODS.includes(method))
    return `${String(method)} isn't one of the methods Nimbus asks for`
  if (!Array.isArray(params)) return `${method} without params`
  if (method === 'personal_sign') return
  if (method === 'eth_signTypedData_v4') return typedDataRefusal(params)
  return transactionRefusal(params[0])
}

/** Who can receive value: the account itself, or one of Nimbus's own contracts. */
function recipientRefusal(account: string, recipient: unknown, what: string) {
  if (!isAddress(recipient)) return `${what} isn't an address`
  if (lower(recipient) === lower(account) || isNimbus(recipient)) return
  return `${what} ${recipient} is neither your account nor a Nimbus contract`
}

// `from` is the connected account: the wallet signs only for the account it holds, so a
// transaction from any other account fails there.
function transactionRefusal(tx: any): string | undefined {
  if (!tx || typeof tx !== 'object') return 'eth_sendTransaction without a transaction'
  const { from, to } = tx
  if (!isAddress(from)) return 'the transaction has no from address'
  if (!isAddress(to)) return 'Nimbus never deploys contracts: the transaction needs a to address'
  const data =
    typeof tx.data === 'string'
      ? lower(tx.data)
      : typeof tx.input === 'string'
        ? lower(tx.input)
        : '0x'
  let value: bigint
  try {
    value = BigInt(tx.value ?? 0)
  } catch {
    return "the transaction's value isn't a number"
  }
  // Nimbus's own contracts: any call.
  if (isNimbus(to)) return
  if (value > 0n) {
    const r = recipientRefusal(from, to, 'ETH recipient')
    if (r) return r
  }
  if (data === '0x' || data === '') return
  // An ERC-20 transfer or approval: the recipient travels inside the calldata.
  const selector = data.slice(0, 10)
  if ((selector === TRANSFER || selector === APPROVE) && data.length === 10 + 128) {
    const recipient = `0x${data.slice(10 + 24, 10 + 64)}`
    return recipientRefusal(
      from,
      recipient,
      selector === TRANSFER ? 'token recipient' : 'token spender'
    )
  }
  return `the transaction calls ${to} with data Nimbus doesn't send`
}

function typedDataRefusal(params: unknown[]): string | undefined {
  const [account, raw] = params
  if (!isAddress(account)) return 'eth_signTypedData_v4 without an account'
  let typed: any
  try {
    typed = typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return "the typed data isn't JSON"
  }
  const message = typed?.message
  if (!message || typeof message !== 'object') return 'the typed data has no message'
  for (const field of RECIPIENT_FIELDS) {
    if (!(field in message)) continue
    const r = recipientRefusal(account, message[field], `the typed data's ${field}`)
    if (r) return r
  }
}
