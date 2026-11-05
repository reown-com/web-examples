import { Button, Row, Text } from '@nextui-org/react'
import { useState } from 'react'
import { GRAY_RGB, McpKeyValue, McpStatusPill, STATUS_RGB } from '@/components/McpUi'
import { truncate } from '@/utils/HelperUtil'
import { McpAction, McpStep } from '@/utils/McpApiUtil'

/**
 * The steps of an action as a numbered list: the facts that matter up front,
 * every other decoded field behind "show more".
 */
const PRIMARY_KEYS = [
  'chain',
  'asset',
  'amount',
  'to',
  'fromAsset',
  'toAsset',
  'amountIn',
  'quotedOut',
  'minOut',
  'maxSlippagePct',
  'recipient',
  'spenderLabel'
]

const LABELS: Record<string, string> = {
  chain: 'Chain',
  asset: 'Asset',
  amount: 'Amount',
  to: 'Recipient',
  recipient: 'Recipient',
  fromAsset: 'From',
  toAsset: 'To',
  amountIn: 'Amount in',
  quotedOut: 'Quoted out',
  minOut: 'Minimum out',
  maxSlippagePct: 'Max slippage',
  feeTierPct: 'Fee tier',
  provider: 'Provider',
  pool: 'Pool',
  spenderLabel: 'Spender',
  spender: 'Spender address',
  tokenAddress: 'Token contract',
  amountBaseUnits: 'Amount (base units)',
  contract: 'Contract',
  contractAddress: 'Contract address',
  toAddress: 'Output token',
  skippedWhen: 'Skipped when',
  purpose: 'Purpose',
  deadline: 'Deadline'
}

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/

export function labelFor(key: string) {
  return LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())
}

export function formatValue(key: string, value: string | number | boolean, full: boolean) {
  const text = String(value)
  if (!full && ADDRESS_PATTERN.test(text)) return truncate(text, 16)
  if (key === 'maxSlippagePct' || key === 'feeTierPct') return `${text}%`
  return text
}

/** The decoded fields worth showing up front, as [label, value] pairs in a fixed order */
export function primaryFacts(step: McpStep): [string, string][] {
  return Object.entries(step.decoded ?? {})
    .filter(([key]) => PRIMARY_KEYS.includes(key))
    .sort((a, b) => PRIMARY_KEYS.indexOf(a[0]) - PRIMARY_KEYS.indexOf(b[0]))
    .map(([key, value]) => [labelFor(key), formatValue(key, value, false)])
}

const ERROR_CLAMP = 160

function StepError({ error }: { error: string }) {
  const [expanded, setExpanded] = useState(false)
  const long = error.length > ERROR_CLAMP
  return (
    <Text size={12} color="error" css={{ marginTop: '$2', wordBreak: 'break-word' }}>
      {long && !expanded ? `${error.slice(0, ERROR_CLAMP)}…` : error}
      {long ? (
        <Button
          light
          auto
          size="xs"
          css={{ padding: 0, height: 'auto', minWidth: 0, marginLeft: '$2', color: '$gray600' }}
          onClick={() => setExpanded(value => !value)}
        >
          {expanded ? 'less' : 'more'}
        </Button>
      ) : null}
    </Text>
  )
}

function StepItem({ step }: { step: McpStep }) {
  const [showAll, setShowAll] = useState(false)
  const decoded = Object.entries(step.decoded ?? {}).filter(([key]) => key !== 'action')
  const primary = primaryFacts(step)
  const extras = decoded.filter(([key]) => !PRIMARY_KEYS.includes(key))
  const rgb = STATUS_RGB[step.status] ?? GRAY_RGB

  return (
    <div
      style={{ display: 'flex', gap: 12, marginBottom: 14 }}
      data-testid={`mcp-action-step-${step.n}`}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 600,
          background: `rgba(${rgb}, 0.18)`,
          color: `rgb(${rgb})`
        }}
      >
        {step.n}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Row justify="space-between" align="flex-start" css={{ gap: '$4', marginBottom: '$3' }}>
          <Text
            size={14}
            weight="medium"
            css={{ flex: 1, minWidth: 0, wordBreak: 'break-word', margin: 0 }}
          >
            {step.summary}
          </Text>
          <McpStatusPill status={step.status} />
        </Row>
        {primary.map(([label, value]) => (
          <McpKeyValue key={label} label={label} value={value} />
        ))}
        {showAll
          ? extras.map(([key, value]) => (
              <McpKeyValue key={key} label={labelFor(key)} value={formatValue(key, value, true)} />
            ))
          : null}
        {step.txHash ? (
          <McpKeyValue
            label="Transaction"
            value={
              step.explorerUrl ? (
                <a
                  href={step.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#0072F5' }}
                >
                  {truncate(step.txHash, 16)}
                </a>
              ) : (
                truncate(step.txHash, 16)
              )
            }
          />
        ) : null}
        {step.error ? <StepError error={step.error} /> : null}
        {extras.length ? (
          <Button
            light
            auto
            size="xs"
            css={{ padding: 0, height: 'auto', minWidth: 0, color: '$gray600', marginTop: '$2' }}
            onClick={() => setShowAll(value => !value)}
          >
            {showAll
              ? 'Hide details'
              : `Show ${extras.length} more ${extras.length === 1 ? 'field' : 'fields'}`}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export default function McpPlanSteps({ action }: { action: McpAction }) {
  return (
    <>
      {action.steps.map(step => (
        <StepItem key={step.n} step={step} />
      ))}
    </>
  )
}
