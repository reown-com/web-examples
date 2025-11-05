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
import { checkApprovalNeeded, clearBalanceCache } from '@/utils/EarnService'
import {
  sendApprovalTransaction,
  sendDepositTransaction,
  sendWithdrawTransaction
} from '@/utils/EarnTransactionService'
import { eip155Addresses } from '@/utils/EIP155WalletUtil'

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
  const { eip155Address, account } = useSnapshot(SettingsStore.state)
  const { refreshBalance, refreshPositions } = useEarnData()

  // Handle address selection
  const handleAddressChange = (accountIndex: number) => {
    SettingsStore.setAccount(accountIndex)
    SettingsStore.setEIP155Address(eip155Addresses[accountIndex])
    styledToast(`Switched to Account ${accountIndex + 1}`, 'success')
  }

  // Format address for display
  const formatAddress = (address: string) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Real balance state
  const [realBalance, setRealBalance] = useState<string>('0')
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)

  // Fetch real balance when protocol or address changes
  useEffect(() => {
    if (earnState.selectedProtocol && eip155Address) {
      setIsLoadingBalance(true)
      refreshBalance()
        .then(balance => {
          setRealBalance(balance)
          setIsLoadingBalance(false)
        })
        .catch(error => {
          console.error('Error fetching balance:', error)
          setRealBalance('0')
          setIsLoadingBalance(false)
        })
    } else {
      setRealBalance('0')
    }
  }, [earnState.selectedProtocol, eip155Address, refreshBalance])

  // Fetch positions when address changes or when active tab is 'positions'
  // Disabled to prevent RPC spam - positions will be fetched after successful deposits
  // useEffect(() => {
  //   if (earnState.activeTab === 'positions' && eip155Address) {
  //     console.log('Fetching positions for address:', eip155Address)
  //     refreshPositions()
  //   }
  // }, [earnState.activeTab, eip155Address, refreshPositions])

  // Fetch real balance when protocol changes
  // Disabled to prevent RPC spam - using mock balance instead
  // useEffect(() => {
  //   if (earnState.selectedProtocol && eip155Address) {
  //     setIsLoadingBalance(true)
  //     refreshBalance().then(balance => {
  //       setRealBalance(balance)
  //       setIsLoadingBalance(false)
  //     })
  //   }
  // }, [earnState.selectedProtocol, eip155Address])

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
    if (!earnState.selectedProtocol || !eip155Address) {
      styledToast('Please select a protocol and ensure your wallet is connected', 'error')
      return
    }

    if (!earnState.depositAmount || parseFloat(earnState.depositAmount) <= 0) {
      styledToast('Please enter a valid amount', 'error')
      return
    }

    if (parseFloat(earnState.depositAmount) > parseFloat(realBalance)) {
      styledToast('Insufficient balance', 'error')
      return
    }

    try {
      EarnStore.setTransactionStatus('approving')
      EarnStore.setLoading(true)

      // Check if approval is needed
      const needsApproval = await checkApprovalNeeded(
        earnState.selectedProtocol,
        eip155Address,
        earnState.depositAmount
      )

      if (needsApproval) {
        styledToast('Approving USDC spending...', 'default')

        // Send approval transaction
        const approvalResult = await sendApprovalTransaction(
          earnState.selectedProtocol,
          earnState.depositAmount,
          eip155Address
        )

        if (!approvalResult.success) {
          throw new Error(approvalResult.error || 'Approval failed')
        }

        styledToast('Approval confirmed! Now depositing...', 'success')
      }

      // Send deposit transaction
      EarnStore.setTransactionStatus('depositing')
      styledToast('Depositing USDC...', 'default')

      const depositResult = await sendDepositTransaction(
        earnState.selectedProtocol,
        earnState.depositAmount,
        eip155Address
      )

      if (!depositResult.success) {
        throw new Error(depositResult.error || 'Deposit failed')
      }

      EarnStore.setTransactionStatus('success', depositResult.txHash)
      styledToast(
        `Successfully deposited ${earnState.depositAmount} ${earnState.selectedProtocol.token.symbol}!`,
        'success'
      )

      // Clear balance cache to force refresh
      clearBalanceCache()

      // Reset form and refresh data
      EarnStore.resetDepositForm()

      // Force refresh balance (skip cache)
      const newBalance = await refreshBalance(true)
      setRealBalance(newBalance)

      refreshPositions()
    } catch (error: any) {
      console.error('Deposit error:', error)
      EarnStore.setTransactionStatus('error')
      styledToast(error.message || 'Transaction failed', 'error')
    } finally {
      EarnStore.setLoading(false)
    }
  }

  const handleWithdraw = async (position: UserPosition, amount: string) => {
    if (!eip155Address) {
      styledToast('Please ensure your wallet is connected', 'error')
      return
    }

    const config = availableProtocols.find(
      p => p.protocol.id === position.protocol && p.chainId === position.chainId
    )

    if (!config) {
      styledToast('Protocol configuration not found', 'error')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      styledToast('Please enter a valid amount to withdraw', 'error')
      return
    }

    if (parseFloat(amount) > parseFloat(position.total)) {
      styledToast('Withdrawal amount exceeds available balance', 'error')
      return
    }

    try {
      EarnStore.setTransactionStatus('withdrawing')
      EarnStore.setLoading(true)

      styledToast('Withdrawing funds...', 'default')

      const withdrawResult = await sendWithdrawTransaction(config, amount, eip155Address)

      if (!withdrawResult.success) {
        throw new Error(withdrawResult.error || 'Withdrawal failed')
      }

      EarnStore.setTransactionStatus('success', withdrawResult.txHash)
      styledToast(`Successfully withdrew ${amount} ${position.token}!`, 'success')

      // Clear balance cache to force refresh
      clearBalanceCache()

      // Force refresh balance (skip cache)
      const newBalance = await refreshBalance(true)
      setRealBalance(newBalance)

      // Refresh positions
      refreshPositions()
    } catch (error: any) {
      console.error('Withdrawal error:', error)
      EarnStore.setTransactionStatus('error')
      styledToast(error.message || 'Transaction failed', 'error')
    } finally {
      EarnStore.setLoading(false)
    }
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

    // Use live APY from store if available, otherwise use config APY
    const liveAPY =
      earnState.apyData[
        `${earnState.selectedProtocol.protocol.id}-${earnState.selectedProtocol.chainId}`
      ]
    const apy = (liveAPY ?? earnState.selectedProtocol.apy) / 100

    return {
      yearly: (amount * apy).toFixed(2),
      monthly: ((amount * apy) / 12).toFixed(2),
      daily: ((amount * apy) / 365).toFixed(2)
    }
  }, [earnState.selectedProtocol, earnState.depositAmount, earnState.apyData])

  return (
    <Fragment>
      <PageHeader title="Earn">
        <Row align="center" css={{ gap: '$4' }}>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Text css={{ fontSize: '12px', color: '$gray600' }}>Account:</Text>
            <select
              value={account}
              onChange={e => handleAddressChange(Number(e.target.value))}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                color: 'white',
                fontSize: '12px',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value={0}>{formatAddress(eip155Addresses[0])}</option>
              <option value={1}>{formatAddress(eip155Addresses[1])}</option>
            </select>
          </div>
        </Row>
      </PageHeader>
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
                  balance={realBalance}
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
                      earnState.loading ||
                      !earnState.depositAmount ||
                      parseFloat(earnState.depositAmount) <= 0 ||
                      parseFloat(earnState.depositAmount) > parseFloat(realBalance)
                    }
                    onClick={handleDeposit}
                  >
                    {earnState.loading ? (
                      <>
                        <Loading size="sm" color="white" css={{ marginRight: '$2' }} />
                        {earnState.transactionStatus === 'approving' && 'Approving...'}
                        {earnState.transactionStatus === 'depositing' && 'Depositing...'}
                      </>
                    ) : (
                      `Stake ${earnState.selectedProtocol.token.symbol}`
                    )}
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
            <Row justify="space-between" align="center" css={{ marginBottom: '16px' }}>
              <Text
                css={{
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '$gray600'
                }}
              >
                Your Active Positions
              </Text>
              <Button
                auto
                size="sm"
                flat
                color="primary"
                disabled={earnState.positionsLoading}
                onClick={() => refreshPositions()}
                css={{ fontSize: '11px' }}
              >
                {earnState.positionsLoading ? 'Loading...' : 'Refresh'}
              </Button>
            </Row>

            {earnState.positionsLoading ? (
              <Card
                css={{
                  padding: '$8',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Loading size="lg" />
                <Text css={{ marginTop: '$4' }}>Loading positions...</Text>
              </Card>
            ) : earnState.positions.length > 0 ? (
              earnState.positions.map((position, index) => (
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
                  {earnState.positions.length === 0 && !earnState.positionsLoading
                    ? 'Click "Refresh" to load your positions, or start earning by depositing in the Earn tab'
                    : 'Start earning by depositing your assets in the Earn tab'}
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
