import { Fragment, useState, useMemo, useEffect } from 'react'
import { useSnapshot } from 'valtio'
import {
  Container,
  Row,
  Col,
  Text,
  Button,
  Card,
  Loading,
  Divider,
  styled
} from '@nextui-org/react'
import PageHeader from '@/components/PageHeader'
import EarnStore from '@/store/EarnStore'
import SettingsStore from '@/store/SettingsStore'
import ProtocolCard from '@/components/Earn/ProtocolCard'
import AmountInput from '@/components/Earn/AmountInput'
import PositionCard from '@/components/Earn/PositionCard'
import { getProtocolsByChain } from '@/data/EarnProtocolsData'
import { ProtocolConfig, UserPosition } from '@/types/earn'
import { styledToast } from '@/utils/HelperUtil'
import useEarnData from '@/hooks/useEarnData'

const StyledText = styled(Text, {
  fontWeight: 400
} as any)

const StyledContainer = styled(Container, {
  maxWidth: '700px',
  padding: '24px 16px'
} as any)

const TabButton = styled(Button, {
  borderRadius: '0',
  minWidth: '140px',
  borderBottom: '2px solid transparent'
} as any)

const InfoCard = styled(Card, {
  padding: '0px',
  marginTop: '16px',
  backgroundColor: 'rgba(99, 102, 241, 0.03)',
  border: '1px solid rgba(99, 102, 241, 0.1)'
} as any)

export default function EarnPage() {
  const earnState = useSnapshot(EarnStore.state)
  const { eip155Address } = useSnapshot(SettingsStore.state)
  const { refreshBalance, refreshPositions } = useEarnData()

  // Mock balance for demo - will be replaced with real balance
  const [mockBalance] = useState('5000')
  const [realBalance, setRealBalance] = useState<string>('0')
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)

  // Mock positions for UI testing
  const [mockPositions] = useState<UserPosition[]>([
    {
      protocol: 'aave',
      chainId: 8453,
      token: 'USDC',
      principal: '1000.00',
      principalUSD: '1,000.00',
      rewards: '12.50',
      rewardsUSD: '12.50',
      total: '1012.50',
      totalUSD: '1,012.50',
      apy: 4.35,
      depositedAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
      lastUpdateAt: Date.now()
    },
    {
      protocol: 'spark',
      chainId: 8453,
      token: 'USDC',
      principal: '500.00',
      principalUSD: '500.00',
      rewards: '8.20',
      rewardsUSD: '8.20',
      total: '508.20',
      totalUSD: '508.20',
      apy: 4.82,
      depositedAt: Date.now() - 15 * 24 * 60 * 60 * 1000, // 15 days ago
      lastUpdateAt: Date.now()
    }
  ])

  // Fetch real balance when protocol changes
  useEffect(() => {
    if (earnState.selectedProtocol && eip155Address) {
      setIsLoadingBalance(true)
      refreshBalance().then(balance => {
        setRealBalance(balance)
        setIsLoadingBalance(false)
      })
    }
  }, [earnState.selectedProtocol, eip155Address, refreshBalance])

  // Get available protocols for Base chain (hardcoded for POC)
  const availableProtocols = useMemo(() => {
    return getProtocolsByChain(earnState.selectedChainId)
  }, [earnState.selectedChainId])

  // Auto-select first protocol on mount if none selected
  useEffect(() => {
    if (!earnState.selectedProtocol && availableProtocols.length > 0) {
      EarnStore.setSelectedProtocol(availableProtocols[0])
    }
  }, [availableProtocols, earnState.selectedProtocol])

  const handleProtocolSelect = (config: ProtocolConfig) => {
    EarnStore.setSelectedProtocol(config)
    EarnStore.setDepositAmount('')
  }

  const handleAmountChange = (amount: string) => {
    EarnStore.setDepositAmount(amount)
  }

  const handleDeposit = async () => {
    if (!earnState.selectedProtocol) {
      styledToast('Please select a protocol', 'error')
      return
    }

    if (!earnState.depositAmount || parseFloat(earnState.depositAmount) <= 0) {
      styledToast('Please enter a valid amount', 'error')
      return
    }

    if (parseFloat(earnState.depositAmount) > parseFloat(mockBalance)) {
      styledToast('Insufficient balance', 'error')
      return
    }

    // Phase 3 will implement actual deposit logic
    styledToast(
      `Deposit functionality coming in Phase 3! Would deposit ${earnState.depositAmount} USDC to ${earnState.selectedProtocol.protocol.displayName}`,
      'success'
    )
  }

  const handleWithdraw = async (position: UserPosition) => {
    // Phase 4 will implement actual withdrawal logic
    styledToast(
      `Withdrawal functionality coming in Phase 4! Would withdraw from ${position.protocol}`,
      'success'
    )
  }

  const calculateEstimatedRewards = useMemo(() => {
    if (
      !earnState.selectedProtocol ||
      !earnState.depositAmount ||
      parseFloat(earnState.depositAmount) <= 0
    ) {
      return null
    }

    const amount = parseFloat(earnState.depositAmount)
    const apy = earnState.selectedProtocol.apy / 100

    return {
      yearly: (amount * apy).toFixed(2),
      monthly: ((amount * apy) / 12).toFixed(2),
      daily: ((amount * apy) / 365).toFixed(2)
    }
  }, [earnState.selectedProtocol, earnState.depositAmount])

  return (
    <Fragment>
      <PageHeader title="Earn"></PageHeader>
      <StyledContainer style={{ padding: '0px' }}>
        {/* Tab Navigation - Minimal Style */}
        <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '24px' }}>
          <Row css={{ gap: 0 }}>
            <TabButton
              light
              auto
              onClick={() => EarnStore.setActiveTab('earn')}
              css={{
                borderBottomColor:
                  earnState.activeTab === 'earn' ? 'rgb(99, 102, 241)' : 'transparent',
                color: earnState.activeTab === 'earn' ? 'white' : '$gray600',
                fontSize: '14px'
              }}
            >
              Earn
            </TabButton>
            <TabButton
              light
              auto
              onClick={() => EarnStore.setActiveTab('positions')}
              css={{
                borderBottomColor:
                  earnState.activeTab === 'positions' ? 'rgb(99, 102, 241)' : 'transparent',
                color: earnState.activeTab === 'positions' ? 'white' : '$gray600',
                fontSize: '14px'
              }}
            >
              My Positions
            </TabButton>
          </Row>
        </div>

        {/* Earn Tab Content */}
        {earnState.activeTab === 'earn' && (
          <Fragment>
            <Text
              css={{
                marginBottom: '16px',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: '$gray600'
              }}
            >
              Select Protocol
            </Text>

            {/* Protocol Cards */}
            {availableProtocols.length > 0 ? (
              availableProtocols.map((config, index) => (
                <ProtocolCard
                  key={`${config.protocol.id}-${config.chainId}`}
                  config={config}
                  selected={
                    earnState.selectedProtocol?.protocol.id === config.protocol.id &&
                    earnState.selectedProtocol?.chainId === config.chainId
                  }
                  onSelect={handleProtocolSelect}
                />
              ))
            ) : (
              <Card css={{ padding: '$10' }}>
                <Text color="$gray600">No protocols available for the selected chain</Text>
              </Card>
            )}

            {/* Deposit Section */}
            {earnState.selectedProtocol && (
              <Fragment>
                <Divider css={{ margin: '24px 0' }} />

                <AmountInput
                  value={earnState.depositAmount}
                  onChange={handleAmountChange}
                  balance={parseFloat(realBalance) > 0 ? realBalance : mockBalance}
                  tokenSymbol={earnState.selectedProtocol.token.symbol}
                  label="Amount to Deposit"
                  placeholder="0.00"
                  disabled={isLoadingBalance}
                />

                {/* Estimated Rewards */}
                {calculateEstimatedRewards && (
                  <InfoCard>
                    <Row align="center" justify="space-between" css={{ marginBottom: '$3' }}>
                      <Text css={{ fontSize: '11px', color: '$gray700', fontWeight: '600' }}>
                        Estimated Rewards
                      </Text>
                    </Row>
                    <Row css={{ gap: '$6' }}>
                      <Col>
                        <Text css={{ fontSize: '11px', color: '$gray600' }}>Daily</Text>
                        <Text
                          weight="semibold"
                          css={{
                            fontSize: '12px',
                            color: '$success',
                            marginTop: '$1',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          +{calculateEstimatedRewards.daily}{' '}
                          {earnState.selectedProtocol.token.symbol}
                        </Text>
                      </Col>
                      <Col>
                        <Text css={{ fontSize: '11px', color: '$gray600' }}>Monthly</Text>
                        <Text
                          weight="semibold"
                          css={{
                            fontSize: '12px',
                            color: '$success',
                            marginTop: '$1',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          +{calculateEstimatedRewards.monthly}{' '}
                          {earnState.selectedProtocol.token.symbol}
                        </Text>
                      </Col>
                      <Col>
                        <Text css={{ fontSize: '11px', color: '$gray600' }}>Yearly</Text>
                        <Text
                          weight="semibold"
                          css={{
                            fontSize: '12px',
                            color: '$success',
                            marginTop: '$1',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          +{calculateEstimatedRewards.yearly}{' '}
                          {earnState.selectedProtocol.token.symbol}
                        </Text>
                      </Col>
                    </Row>
                  </InfoCard>
                )}

                {/* Deposit Button */}
                <Row css={{ marginTop: '20px' }}>
                  <Button
                    css={{
                      width: '100%',
                      height: '44px',
                      fontSize: '14px',
                      fontWeight: '600',
                      backgroundColor: 'rgb(99, 102, 241)',
                      '&:hover': {
                        backgroundColor: 'rgb(79, 82, 221)'
                      }
                    }}
                    disabled={
                      !earnState.depositAmount ||
                      parseFloat(earnState.depositAmount) <= 0 ||
                      parseFloat(earnState.depositAmount) > parseFloat(mockBalance)
                    }
                    onClick={handleDeposit}
                  >
                    Stake {earnState.selectedProtocol.token.symbol}
                  </Button>
                </Row>

                {/* Info Messages */}
                <Card
                  css={{
                    marginTop: '16px',
                    padding: '0px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                >
                  <Text css={{ fontSize: '12px', color: '$gray600', lineHeight: 1.6 }}>
                    • First-time staking requires approval transaction
                  </Text>
                  <Text css={{ fontSize: '12px', color: '$gray600', lineHeight: 1.6 }}>
                    • Rewards are automatically compounded
                  </Text>
                  <Text css={{ fontSize: '12px', color: '$gray600', lineHeight: 1.6 }}>
                    • You can withdraw anytime without lock-up period
                  </Text>
                </Card>
              </Fragment>
            )}
          </Fragment>
        )}

        {/* My Positions Tab Content */}
        {earnState.activeTab === 'positions' && (
          <Fragment>
            <Text
              css={{
                marginBottom: '16px',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: '$gray600'
              }}
            >
              Your Active Positions
            </Text>

            {earnState.positionsLoading ? (
              <Card css={{ padding: '$8', textAlign: 'center' }}>
                <Loading size="lg" />
                <Text css={{ marginTop: '$4' }}>Loading positions...</Text>
              </Card>
            ) : mockPositions.length > 0 ? (
              mockPositions.map((position, index) => (
                <PositionCard
                  key={`${position.protocol}-${position.chainId}-${index}`}
                  position={position}
                  onWithdraw={handleWithdraw}
                />
              ))
            ) : (
              <Card css={{ padding: '0px', textAlign: 'center' }}>
                <Text css={{ fontSize: '16px', fontWeight: '600' }}>No active positions</Text>
                <Text css={{ marginTop: '$3', fontSize: '13px', color: '$gray600' }}>
                  Start earning by depositing your assets in the Earn tab
                </Text>
                <Button
                  auto
                  flat
                  color="primary"
                  css={{ marginTop: '$6', fontSize: '13px' }}
                  onClick={() => EarnStore.setActiveTab('earn')}
                >
                  Go to Earn
                </Button>
              </Card>
            )}
          </Fragment>
        )}

        {/* Footer */}
        <Row css={{ marginTop: '32px', padding: '16px 0' }} justify="center">
          <Text css={{ fontSize: '11px', color: '$gray700' }}>
            Powered by Aave V3 and Spark Protocol
          </Text>
        </Row>
      </StyledContainer>
    </Fragment>
  )
}
