import { useCallback, useEffect, useRef, useState } from 'react'
import { concat, keccak256, toHex, type Hex } from 'viem'
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts'

import { Avatar, Sheet, SheetHead } from '@/components/ui'
import { isSanctioned, SANCTIONED, short } from '@/lib/common'

export const KEY = 'demo-wallet-key'
const SELECTED = 'demo-wallet-account'

export interface Account {
  id: string
  label: string
  address: string
  watchOnly?: boolean
}

export const sanctionBadge = (a: Account) =>
  a.watchOnly ? 'sanctioned · watch-only' : 'sanctioned'

/**
 * Two accounts from the stored key: the key itself, and one derived from it so it's stable across
 * reloads. Without a sanctioned one among them, the sanctioned address is added watch-only.
 */
export function useAccounts() {
  const signers = useRef(new Map<string, PrivateKeyAccount>())
  const [accounts, setAccounts] = useState<Account[]>([])
  const [currentId, setCurrentId] = useState<string>()

  useEffect(() => {
    let pk = localStorage.getItem(KEY) as Hex | null
    if (!pk) localStorage.setItem(KEY, (pk = generatePrivateKey()))
    const list: Account[] = [pk, keccak256(concat([pk, toHex('ember/account/2')]))].map((k, i) => {
      const signer = privateKeyToAccount(k)
      signers.current.set(signer.address.toLowerCase(), signer)
      return {
        id: isSanctioned(signer.address) ? 'sanctioned' : `key${i}`,
        label: `Account ${i + 1}`,
        address: signer.address
      }
    })
    if (!list.some(a => isSanctioned(a.address)))
      list.push({ id: 'sanctioned', label: 'Sanctioned', address: SANCTIONED, watchOnly: true })
    setAccounts(list)
    const stored = localStorage.getItem(SELECTED)
    setCurrentId(
      (list.find(a => a.id === stored) ?? list.find(a => !isSanctioned(a.address)) ?? list[0]).id
    )
  }, [])

  const select = useCallback((id: string) => {
    localStorage.setItem(SELECTED, id)
    setCurrentId(id)
  }, [])
  const signerFor = useCallback(
    (address?: string) => (address ? signers.current.get(address.toLowerCase()) : undefined),
    []
  )
  const current = accounts.find(a => a.id === currentId)
  return { accounts, current, select, signerFor }
}

export function AccountsSheet({
  open,
  accounts,
  current,
  onSelect,
  onClose,
  onReset
}: {
  open: boolean
  accounts: Account[]
  current?: Account
  onSelect: (id: string) => void
  onClose: () => void
  onReset: () => void
}) {
  return (
    <Sheet open={open} onClose={onClose}>
      <SheetHead title="Accounts" onClose={onClose} />
      <div className="stack">
        {accounts.map(a => (
          <button
            key={a.id}
            className={`acct-option ${a.id === current?.id ? 'on' : ''}`}
            data-account={a.id}
            onClick={() => {
              onSelect(a.id)
              onClose()
            }}
          >
            <Avatar seed={a.address} size={40} />
            <span className="grow">
              <strong>{a.label}</strong>
              <br />
              <small>{short(a.address, 10)}</small>
            </span>
            {isSanctioned(a.address) && <span className="badge warn">{sanctionBadge(a)}</span>}
          </button>
        ))}
        <p className="faint" style={{ fontSize: 12.5 }}>
          {accounts.some(a => a.watchOnly)
            ? 'The sanctioned account is watch-only: Ember can share it with a dApp but holds no key for it.'
            : "Account 2 is derived from Account 1's key."}
        </p>
        <button className="btn ghost sm" onClick={onReset}>
          Reset Ember
        </button>
      </div>
    </Sheet>
  )
}
