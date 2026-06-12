import { useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'
import { getSdkError } from '@walletconnect/utils'
import { SignClientTypes } from '@walletconnect/types'
import ModalStore from '@/store/ModalStore'
import SettingsStore from '@/store/SettingsStore'
import { walletkit } from '@/utils/walletConnect'
import { buildNamespaces } from '@/utils/namespaces'
import { getChainMeta } from '@/config/chains'

export default function SessionProposalModal() {
  const { data } = useSnapshot(ModalStore.state)
  const { accounts } = useSnapshot(SettingsStore.state)
  const proposal = data.proposal as SignClientTypes.EventArguments['session_proposal']
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { metadata } = proposal.params.proposer

  const requestedChains = useMemo(() => {
    const all = [
      ...Object.entries(proposal.params.requiredNamespaces),
      ...Object.entries(proposal.params.optionalNamespaces)
    ].flatMap(([key, value]) => (key.includes(':') ? [key] : value.chains ?? []))
    return Array.from(new Set(all))
  }, [proposal])

  async function onApprove() {
    if (!accounts) return
    setError(null)
    setLoading('approve')
    try {
      const namespaces = buildNamespaces(proposal.params, accounts)
      await walletkit.approveSession({ id: proposal.id, namespaces })
      SettingsStore.setSessions(Object.values(walletkit.getActiveSessions()))
      ModalStore.close()
    } catch (e) {
      console.error('Failed to approve session', e)
      setError((e as Error).message)
      setLoading(null)
    }
  }

  async function onReject() {
    setLoading('reject')
    try {
      await walletkit.rejectSession({
        id: proposal.id,
        reason: getSdkError('USER_REJECTED_METHODS')
      })
    } catch (e) {
      console.error('Failed to reject session', e)
    }
    ModalStore.close()
  }

  return (
    <div className="modal">
      <h2>Session Proposal</h2>
      <div className="dapp">
        {metadata.icons?.[0] && <img src={metadata.icons[0]} alt="" />}
        <div>
          <div style={{ fontWeight: 600 }}>{metadata.name || 'Unknown dApp'}</div>
          <div className="muted mono">{metadata.url}</div>
        </div>
      </div>

      <div className="kv">
        <span className="k">Requested chains</span>
      </div>
      <div className="tag-list">
        {requestedChains.map(chain => (
          <span className="chip" key={chain}>
            {getChainMeta(chain)?.name ?? chain}
          </span>
        ))}
      </div>

      {error && (
        <div className="banner error" style={{ marginTop: 16 }}>
          {error}
        </div>
      )}

      <div className="modal-actions">
        <button className="secondary" onClick={onReject} disabled={loading !== null}>
          {loading === 'reject' ? 'Rejecting…' : 'Reject'}
        </button>
        <button onClick={onApprove} disabled={loading !== null || !accounts}>
          {loading === 'approve' ? 'Approving…' : 'Approve'}
        </button>
      </div>
    </div>
  )
}
