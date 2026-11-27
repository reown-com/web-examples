import { Card, Row, Text, styled } from '@nextui-org/react'
import { CSSProperties, ReactNode, useEffect, useState } from 'react'
import { EIP155_CHAINS } from '@/data/EIP155Data'

/**
 * Shared building blocks for the WalletConnect MCP page: pills, chain chips,
 * section cards, key/value rows, a segmented control and the input style.
 */

export const GRAY_RGB = '139, 139, 139'
export const SUCCESS_RGB = '23, 201, 100'
export const WARNING_RGB = '245, 165, 36'
export const ERROR_RGB = '240, 64, 64'
export const PRIMARY_RGB = '0, 114, 245'

export const STATUS_RGB: Record<string, string> = {
  prepared: WARNING_RGB,
  awaiting_wallet: WARNING_RGB,
  queued: GRAY_RGB,
  skipped: GRAY_RGB,
  submitted: PRIMARY_RGB,
  confirmed: SUCCESS_RGB,
  rejected: ERROR_RGB,
  expired: ERROR_RGB,
  failed: ERROR_RGB,
  cancelled: GRAY_RGB
}

/** Same bordered look the WalletConnect page gives its URI input */
export const MCP_INPUT_CSS = {
  width: '100%',
  '& label': { color: '$gray600', fontSize: '12px' },
  // Only the field itself; the helper text container is a sibling div and must stay plain.
  '& .nextui-input-container': {
    border: '1.5px solid rgba(255, 255, 255, 0.14) !important',
    borderRadius: '14px',
    padding: '6px 12px',
    background: 'rgba(255, 255, 255, 0.03)'
  },
  '& .nextui-input-helper-text-container': { paddingLeft: '$2' }
}

export function formatStatus(status: string) {
  return status.replace(/_/g, ' ')
}

export function chainMeta(chainIdOrName?: string) {
  if (!chainIdOrName) return undefined
  const byId = EIP155_CHAINS[chainIdOrName as keyof typeof EIP155_CHAINS]
  if (byId) return byId
  const wanted = chainIdOrName.toLowerCase()
  return Object.values(EIP155_CHAINS).find(chain => chain.name.toLowerCase() === wanted)
}

/** Seconds left until an ISO timestamp, ticking once a second; null without a timestamp */
export function useCountdown(expiresAt?: string) {
  const [remaining, setRemaining] = useState<number | null>(null)
  useEffect(() => {
    if (!expiresAt) {
      setRemaining(null)
      return
    }
    const target = Date.parse(expiresAt)
    const tick = () => setRemaining(Math.max(0, Math.round((target - Date.now()) / 1000)))
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [expiresAt])
  return remaining
}

/**
 * Pills and chips
 */
const Pill = styled('span', {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  borderRadius: '999px',
  padding: '3px 10px',
  fontSize: '12px',
  fontWeight: 500,
  lineHeight: '16px',
  whiteSpace: 'nowrap',
  fontFamily: '$sans'
} as any)

interface PillProps {
  rgb: string
  dot?: boolean
  children: ReactNode
  style?: CSSProperties
  'data-testid'?: string
}

export function McpPill({ rgb, dot, children, style, ...rest }: PillProps) {
  return (
    <Pill style={{ background: `rgba(${rgb}, 0.14)`, color: `rgb(${rgb})`, ...style }} {...rest}>
      {dot ? (
        <span
          style={{ width: 6, height: 6, borderRadius: 3, background: `rgb(${rgb})`, flexShrink: 0 }}
        />
      ) : null}
      {children}
    </Pill>
  )
}

export function McpStatusPill({ status, ...rest }: { status: string; 'data-testid'?: string }) {
  return (
    <McpPill rgb={STATUS_RGB[status] ?? GRAY_RGB} dot {...rest}>
      {formatStatus(status)}
    </McpPill>
  )
}

export function McpChainChip({ chain }: { chain: string }) {
  const meta = chainMeta(chain)
  return (
    <McpPill rgb={meta?.rgb ?? GRAY_RGB} style={{ padding: '3px 10px 3px 4px' }}>
      {meta ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={meta.logo} alt="" width={16} height={16} style={{ borderRadius: 8 }} />
      ) : null}
      {meta?.name ?? chain}
    </McpPill>
  )
}

/**
 * Section card with a title row
 */
interface SectionProps {
  title: string
  subtitle?: ReactNode
  right?: ReactNode
  children: ReactNode
  'data-testid'?: string
}

export function McpSection({ title, subtitle, right, children, ...rest }: SectionProps) {
  return (
    <Card
      bordered
      borderWeight="light"
      css={{ marginBottom: '$8', background: 'rgba(255, 255, 255, 0.02)' }}
      {...rest}
    >
      <Card.Body css={{ padding: '$8' }}>
        <Row
          justify="space-between"
          align="center"
          css={{ marginBottom: subtitle ? '$2' : '$6', gap: '$4' }}
        >
          <Text h5 css={{ margin: 0 }}>
            {title}
          </Text>
          {right ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {right}
            </div>
          ) : null}
        </Row>
        {subtitle ? (
          <Text size={12} color="$gray600" css={{ marginBottom: children ? '$6' : 0 }}>
            {subtitle}
          </Text>
        ) : null}
        {children}
      </Card.Body>
    </Card>
  )
}

/** Hint or error under an input; NextUI's own helperText is absolutely positioned and overlaps the field */
export function McpFieldHint({ error, hint }: { error?: string; hint?: string }) {
  if (!error && !hint) return null
  return (
    <Text
      size={12}
      color={error ? 'error' : '$gray600'}
      css={{ margin: '-$4 0 $6 $2' }}
      data-testid={error ? 'mcp-field-error' : undefined}
    >
      {error ?? hint}
    </Text>
  )
}

/**
 * Label on the left, value on the right
 */
export function McpKeyValue({
  label,
  value,
  testId
}: {
  label: string
  value: ReactNode
  testId?: string
}) {
  return (
    <Row justify="space-between" align="flex-start" css={{ gap: '$6', marginBottom: '$2' }}>
      <Text size={12} color="$gray600" css={{ flexShrink: 0, margin: 0 }}>
        {label}
      </Text>
      <Text
        size={13}
        css={{ textAlign: 'right', wordBreak: 'break-all', minWidth: 0, margin: 0 }}
        data-testid={testId}
      >
        {value}
      </Text>
    </Row>
  )
}

/**
 * Segmented control (two or three tabs)
 */
interface SegmentedProps<T extends string> {
  value: T
  options: { value: T; label: string; icon?: ReactNode }[]
  onChange: (value: T) => void
  disabled?: boolean
}

export function McpSegmented<T extends string>({
  value,
  options,
  onChange,
  disabled
}: SegmentedProps<T>) {
  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        background: 'rgba(139, 139, 139, 0.18)',
        borderRadius: 12,
        padding: 3,
        marginBottom: 16
      }}
    >
      {options.map(option => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            data-testid={`mcp-tab-${option.value}`}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              border: 'none',
              cursor: disabled ? 'default' : 'pointer',
              borderRadius: 10,
              padding: '8px 10px',
              fontFamily: 'var(--nextui-fonts-sans)',
              fontSize: 13,
              fontWeight: 500,
              color: active ? '#fff' : 'rgba(255, 255, 255, 0.6)',
              background: active ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              transition: 'background .15s ease'
            }}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
