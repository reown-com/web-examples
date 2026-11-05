import { Avatar, Button, Loading, Row, Text } from '@nextui-org/react'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useEffect, useState } from 'react'
import { McpSection } from '@/components/McpUi'
import { truncate } from '@/utils/HelperUtil'
import { McpPortfolio } from '@/utils/McpApiUtil'

/**
 * Types
 */
interface Props {
  portfolio: McpPortfolio | null
  error: string | null
  chains: ReadonlyArray<{ id: string; name: string }>
  chain: string
  onChainChange: (chain: string) => Promise<void>
  onRefresh: () => Promise<void>
}

const EXPANDED_KEY = 'MCP_PORTFOLIO_EXPANDED'

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`
}

/**
 * Component: collapsed to a one-line summary by default, expandable to the asset list.
 */
export default function McpPortfolioCard({
  portfolio,
  error,
  chains,
  chain,
  onChainChange,
  onRefresh
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)

  // Remember the choice per browser; read it after mount to keep the first render stable.
  useEffect(() => {
    try {
      setExpanded(localStorage.getItem(EXPANDED_KEY) === 'YES')
    } catch {
      // storage unavailable: stay collapsed
    }
  }, [])

  function toggle() {
    const next = !expanded
    setExpanded(next)
    try {
      if (next) localStorage.setItem(EXPANDED_KEY, 'YES')
      else localStorage.removeItem(EXPANDED_KEY)
    } catch {
      // storage unavailable: the toggle still works for this page view
    }
  }

  async function run(task: () => Promise<void>) {
    setLoading(true)
    try {
      await task()
    } finally {
      setLoading(false)
    }
  }

  const summary = error
    ? 'Could not load'
    : !portfolio
    ? 'Loading…'
    : `${portfolio.assets.length} ${portfolio.assets.length === 1 ? 'asset' : 'assets'} on ${
        portfolio.chain
      }${portfolio.totalUsd !== undefined ? ` · ${formatUsd(portfolio.totalUsd)}` : ''}`

  return (
    <McpSection
      title="Portfolio"
      subtitle={summary}
      right={
        <Button
          light
          auto
          size="xs"
          css={{ minWidth: 0, padding: '0 $2', color: '$gray600' }}
          icon={
            expanded ? (
              <ExpandLessIcon style={{ fontSize: 22 }} />
            ) : (
              <ExpandMoreIcon style={{ fontSize: 22 }} />
            )
          }
          onClick={toggle}
          aria-label={expanded ? 'hide portfolio details' : 'show portfolio details'}
          aria-expanded={expanded}
          data-testid="mcp-portfolio-toggle"
        />
      }
      data-testid="mcp-portfolio-card"
    >
      {expanded ? (
        <div data-testid="mcp-portfolio-details">
          <Row justify="space-between" align="center" css={{ marginBottom: '$6', gap: '$4' }}>
            <Text size={12} color="$gray600" css={{ margin: 0, wordBreak: 'break-all' }}>
              {portfolio ? truncate(portfolio.address, 24) : ''}
            </Text>
            <Row align="center" css={{ width: 'auto', gap: '$3', flexShrink: 0 }}>
              <select
                value={chain}
                disabled={loading}
                onChange={e => run(() => onChainChange(e.currentTarget.value))}
                aria-label="mcp portfolio chain"
                data-testid="mcp-portfolio-chain"
              >
                {chains.map(option => (
                  <option key={option.id} value={option.name}>
                    {option.name}
                  </option>
                ))}
              </select>
              <Button
                light
                auto
                size="xs"
                css={{ minWidth: 0, padding: '0 $2', color: '$gray600' }}
                disabled={loading}
                icon={loading ? <Loading size="xs" /> : <RefreshIcon style={{ fontSize: 18 }} />}
                onClick={() => run(onRefresh)}
                aria-label="refresh portfolio"
                data-testid="mcp-portfolio-refresh"
              />
            </Row>
          </Row>

          {error ? (
            <Text color="error" size={13} data-testid="mcp-portfolio-error">
              {error}
            </Text>
          ) : null}

          {!portfolio && !error ? <Loading type="points" /> : null}

          {portfolio ? (
            <>
              {portfolio.assets.length === 0 ? (
                <Text size={13} color="$gray600">
                  No assets on {portfolio.chain}. Fund this address to try a transfer or a swap.
                </Text>
              ) : (
                portfolio.assets.map(asset => (
                  <Row
                    key={asset.address ?? asset.symbol}
                    align="center"
                    css={{ gap: '$6', marginBottom: '$5' }}
                    data-testid={`mcp-portfolio-asset-${asset.symbol}`}
                  >
                    <Avatar text={asset.symbol.slice(0, 1)} size="sm" color="gradient" squared />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text size={14} weight="medium" css={{ margin: 0 }}>
                        {asset.symbol}
                      </Text>
                      <Text size={12} color="$gray600" css={{ margin: 0 }}>
                        {asset.name}
                      </Text>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, maxWidth: '55%' }}>
                      <Text size={14} css={{ margin: 0, wordBreak: 'break-all' }}>
                        {asset.amount}
                      </Text>
                      {asset.valueUsd !== undefined ? (
                        <Text size={12} color="$gray600" css={{ margin: 0 }}>
                          {formatUsd(asset.valueUsd)}
                        </Text>
                      ) : null}
                    </div>
                  </Row>
                ))
              )}
              {portfolio.totalUsd !== undefined && portfolio.assets.length > 0 ? (
                <Row
                  justify="space-between"
                  css={{
                    marginTop: '$6',
                    paddingTop: '$5',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  <Text size={13} color="$gray600" css={{ margin: 0 }}>
                    Total
                  </Text>
                  <Text weight="semibold" css={{ margin: 0 }} data-testid="mcp-portfolio-total">
                    {formatUsd(portfolio.totalUsd)}
                  </Text>
                </Row>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </McpSection>
  )
}
