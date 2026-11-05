import NorthEastIcon from '@mui/icons-material/NorthEast'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import { useState } from 'react'
import McpSwapForm, { McpSwapInput } from '@/components/McpSwapForm'
import McpTransferForm, { McpTransferInput } from '@/components/McpTransferForm'
import { McpSection, McpSegmented } from '@/components/McpUi'
import { McpCaps, McpQuote, McpSwapChainAssets } from '@/utils/McpApiUtil'

/**
 * Types
 */
type Tab = 'transfer' | 'swap'

interface Props {
  chains: ReadonlyArray<{ id: string; name: string }>
  caps: McpCaps | null
  /** Chains with their swappable assets, from GET /swaps/assets; null while not loaded */
  swapChains: ReadonlyArray<McpSwapChainAssets> | null
  swapChainsError: string | null
  disabled: boolean
  onReloadSwapChains: () => void
  onQuote: (input: McpSwapInput) => Promise<McpQuote>
  onPrepareTransfer: (input: McpTransferInput) => Promise<void>
  onPrepareSwap: (input: McpSwapInput) => Promise<void>
}

/**
 * Component
 */
export default function McpActionForms({
  chains,
  caps,
  swapChains,
  swapChainsError,
  disabled,
  onReloadSwapChains,
  onQuote,
  onPrepareTransfer,
  onPrepareSwap
}: Props) {
  const [tab, setTab] = useState<Tab>('transfer')

  return (
    <McpSection
      title="New action"
      subtitle={
        disabled
          ? 'Finish or cancel the current action first; the server allows one at a time.'
          : 'Prepared by the MCP server, then approved in this wallet like any other request.'
      }
    >
      <McpSegmented<Tab>
        value={tab}
        onChange={setTab}
        disabled={disabled}
        options={[
          {
            value: 'transfer',
            label: 'Transfer',
            icon: <NorthEastIcon style={{ fontSize: 16 }} />
          },
          { value: 'swap', label: 'Swap', icon: <SwapHorizIcon style={{ fontSize: 16 }} /> }
        ]}
      />
      {tab === 'transfer' ? (
        <McpTransferForm
          chains={chains}
          caps={caps}
          disabled={disabled}
          onPrepare={onPrepareTransfer}
        />
      ) : (
        <McpSwapForm
          chains={swapChains}
          chainsError={swapChainsError}
          caps={caps}
          disabled={disabled}
          onReloadChains={onReloadSwapChains}
          onQuote={onQuote}
          onPrepare={onPrepareSwap}
        />
      )}
    </McpSection>
  )
}
