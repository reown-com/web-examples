import { Modal, Text, Loading } from '@nextui-org/react'
import { Fragment, useState, useEffect, useCallback } from 'react'
import VerifiedIcon from '@mui/icons-material/Verified'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CloseIcon from '@mui/icons-material/Close'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import type { PaymentOption } from '@walletconnect/pay'
import {
  FormHeader,
  FormHeaderButton,
  FormProgressDot,
  FormProgressDots,
  PayButton,
  PaymentInfoContainer,
  PaymentInfoLabel,
  PaymentInfoMerchantLogo,
  PaymentInfoRow,
  PaymentInfoTitle,
  PaymentInfoValue,
  PaymentMethodDropdown,
  PaymentMethodSelector,
  BalanceCard,
  BalanceRow,
  BalanceLabel,
  BalanceValue,
  ChainBadge,
  ChainIcon,
  TokenIconStack,
  TokenIconPrimary,
  TokenIconSecondary,
  PaymentOptionCard,
  PaymentOptionInfo,
  PaymentOptionAmount,
  PaymentOptionChain,
  PaymentOptionBalance,
  EtaBadge
} from './styles'
import { formatAmount, formatEta } from './utils'
import { getChainById } from '@/utils/ChainUtil'
import { createPublicClient, erc20Abi, http, formatUnits } from 'viem'
import { blockchainApiRpc } from '@/data/EIP155Data'
import SettingsStore from '@/store/SettingsStore'

interface PaymentInfoScreenProps {
  merchantName?: string
  merchantIconUrl?: string
  paymentAmount?: {
    value: string
    display?: {
      decimals?: number
    }
  }
  options: PaymentOption[]
  selectedOption: PaymentOption | null
  totalProgressDots: number
  isProcessing: boolean
  onSelectOption: (option: PaymentOption) => void
  onConfirm: () => void
  onBack: () => void
  onClose: () => void
}

type BalanceMap = Record<string, { balance: string; loading: boolean }>

function parseCAIP10Account(account: string): { namespace: string; chainId: string; address: string } | null {
  const parts = account.split(':')
  if (parts.length !== 3) return null
  return { namespace: parts[0], chainId: parts[1], address: parts[2] }
}

export default function PaymentInfoScreen({
  merchantName,
  merchantIconUrl,
  paymentAmount,
  options,
  selectedOption,
  totalProgressDots,
  isProcessing,
  onSelectOption,
  onConfirm,
  onBack,
  onClose
}: PaymentInfoScreenProps) {
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false)
  const [balances, setBalances] = useState<BalanceMap>({})

  const formattedPaymentAmount = paymentAmount
    ? `$${formatAmount(paymentAmount.value, paymentAmount.display?.decimals || 2)}`
    : ''

  const fetchBalanceForOption = useCallback(async (option: PaymentOption) => {
    const parsed = parseCAIP10Account(option.account)
    if (!parsed || parsed.namespace !== 'eip155') {
      console.warn('[PaymentInfoScreen] Skipping non-eip155 account:', option.account)
      return
    }

    const chainId = parseInt(parsed.chainId, 10)
    // Use the address from the payment option account (CAIP-10 format)
    const userAddress = parsed.address

    console.log('[PaymentInfoScreen] Fetching balance for:', {
      account: option.account,
      chainId,
      userAddress,
      settingsAddress: SettingsStore.state.eip155Address
    })

    if (!userAddress) return

    setBalances(prev => ({ ...prev, [option.id]: { balance: '0', loading: true } }))

    try {
      const chain = getChainById(chainId)
      const publicClient = createPublicClient({
        chain,
        transport: http(blockchainApiRpc(chainId))
      })

      // Parse CAIP-19 asset format: "caip19/eip155:8453/erc20:0x..." or "eip155:8453/slip44:60"
      let assetUnit = option.amount.unit
      console.log('[PaymentInfoScreen] Parsing asset unit:', assetUnit)
      
      // Remove "caip19/" prefix if present
      if (assetUnit.startsWith('caip19/')) {
        assetUnit = assetUnit.substring(7)
      }
      
      // Now format is: "eip155:8453/erc20:0x..." or "eip155:8453/slip44:60"
      // Split by '/' to get [chainPart, assetPart]
      const parts = assetUnit.split('/')
      if (parts.length < 2) {
        console.warn('[PaymentInfoScreen] Invalid asset unit format (need at least 2 parts):', assetUnit)
        setBalances(prev => ({ ...prev, [option.id]: { balance: '0', loading: false } }))
        return
      }
      
      // Asset part is the last part: "erc20:0x..." or "slip44:60"
      const assetPart = parts[parts.length - 1]
      const colonIndex = assetPart.indexOf(':')
      
      if (colonIndex === -1) {
        console.warn('[PaymentInfoScreen] Invalid asset part format (no :):', assetPart)
        setBalances(prev => ({ ...prev, [option.id]: { balance: '0', loading: false } }))
        return
      }
      
      const assetNamespace = assetPart.substring(0, colonIndex) // "erc20" or "slip44"
      const assetReference = assetPart.substring(colonIndex + 1) // "0x..." or "60"
      
      console.log('[PaymentInfoScreen] Asset details:', { assetNamespace, assetReference, userAddress })

      let balance: bigint
      if (assetNamespace === 'slip44') {
        // Native token (ETH)
        balance = await publicClient.getBalance({ address: userAddress as `0x${string}` })
      } else if (assetNamespace === 'erc20' && assetReference.startsWith('0x')) {
        // ERC20 token
        console.log('[PaymentInfoScreen] Fetching ERC20 balance:', { 
          tokenAddress: assetReference, 
          userAddress,
          chainId 
        })
        balance = await publicClient.readContract({
          address: assetReference as `0x${string}`,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [userAddress as `0x${string}`]
        })
        console.log('[PaymentInfoScreen] Raw ERC20 balance:', balance.toString())
      } else {
        console.warn('[PaymentInfoScreen] Unsupported asset namespace:', assetNamespace)
        balance = BigInt(0)
      }

      const decimals = option.amount.display?.decimals || 18
      const formattedBalance = formatUnits(balance, decimals)
      console.log('[PaymentInfoScreen] Formatted balance:', formattedBalance, 'decimals:', decimals)

      setBalances(prev => ({ ...prev, [option.id]: { balance: formattedBalance, loading: false } }))
    } catch (error) {
      console.error('[PaymentInfoScreen] Failed to fetch balance:', error)
      setBalances(prev => ({ ...prev, [option.id]: { balance: '0', loading: false } }))
    }
  }, [])

  useEffect(() => {
    options.forEach(option => {
      if (!balances[option.id]) {
        fetchBalanceForOption(option)
      }
    })
  }, [options, balances, fetchBalanceForOption])

  const handleSelectOption = (option: PaymentOption) => {
    onSelectOption(option)
    setShowPaymentDropdown(false)
  }

  const getBalanceDisplay = (optionId: string): string => {
    const bal = balances[optionId]
    if (!bal) return '...'
    if (bal.loading) return '...'
    const num = parseFloat(bal.balance)
    if (num === 0) return '0'
    if (num < 0.01) return '<0.01'
    return num.toFixed(2)
  }

  const isInsufficientBalance = (option: PaymentOption): boolean => {
    const bal = balances[option.id]
    if (!bal || bal.loading) return false
    const balance = parseFloat(bal.balance)
    const required = parseFloat(formatAmount(option.amount.value, option.amount.display?.decimals || 18))
    return balance < required
  }

  return (
    <Fragment>
      <Modal.Body css={{ padding: 0 }}>
        <FormHeader>
          <FormHeaderButton onClick={onBack}>
            <ArrowBackIcon sx={{ fontSize: 24, color: '#666' }} />
          </FormHeaderButton>
          <FormProgressDots>
            {Array.from({ length: totalProgressDots }).map((_, index) => (
              <FormProgressDot key={index} active={true} />
            ))}
          </FormProgressDots>
          <FormHeaderButton onClick={onClose}>
            <CloseIcon sx={{ fontSize: 24, color: '#666' }} />
          </FormHeaderButton>
        </FormHeader>

        <PaymentInfoContainer>
          <PaymentInfoMerchantLogo>
            {merchantIconUrl ? (
              <img src={merchantIconUrl} alt={merchantName || 'Merchant'} />
            ) : (
              <Text b css={{ color: 'white', fontSize: '28px' }}>
                {merchantName?.charAt(0) || 'M'}
              </Text>
            )}
          </PaymentInfoMerchantLogo>

          <PaymentInfoTitle>
            <Text h4 css={{ margin: 0, fontWeight: '600' }}>
              Pay {formattedPaymentAmount} to {merchantName || 'Merchant'}
            </Text>
            <VerifiedIcon sx={{ fontSize: 20, color: '#0094FF' }} />
          </PaymentInfoTitle>

          {selectedOption && (
            <BalanceCard>
              <BalanceRow>
                <BalanceLabel>
                  <AccountBalanceWalletIcon sx={{ fontSize: 16 }} />
                  Your Balance
                </BalanceLabel>
                <BalanceValue>
                  {balances[selectedOption.id]?.loading ? (
                    <Loading size="xs" />
                  ) : (
                    <>
                      {getBalanceDisplay(selectedOption.id)} {selectedOption.amount.display?.assetSymbol || ''}
                      {selectedOption.amount.display?.networkIconUrl && (
                        <ChainIcon
                          src={selectedOption.amount.display.networkIconUrl}
                          alt={selectedOption.amount.display?.networkName || 'Network'}
                        />
                      )}
                    </>
                  )}
                </BalanceValue>
              </BalanceRow>
              <BalanceRow>
                <BalanceLabel>
                  <AccessTimeIcon sx={{ fontSize: 16 }} />
                  Estimated Time
                </BalanceLabel>
                <BalanceValue>
                  <EtaBadge>{formatEta(selectedOption.etaS)}</EtaBadge>
                </BalanceValue>
              </BalanceRow>
              {selectedOption.amount.display?.networkName && (
                <BalanceRow>
                  <BalanceLabel>Network</BalanceLabel>
                  <ChainBadge>
                    {selectedOption.amount.display?.networkIconUrl && (
                      <ChainIcon
                        src={selectedOption.amount.display.networkIconUrl}
                        alt={selectedOption.amount.display.networkName}
                      />
                    )}
                    {selectedOption.amount.display.networkName}
                  </ChainBadge>
                </BalanceRow>
              )}
            </BalanceCard>
          )}

          <PaymentInfoRow>
            <PaymentInfoLabel>Amount</PaymentInfoLabel>
            <PaymentInfoValue>{formattedPaymentAmount}</PaymentInfoValue>
          </PaymentInfoRow>

          <PaymentInfoRow css={{ position: 'relative' }}>
            <PaymentInfoLabel>Pay with</PaymentInfoLabel>
            <PaymentMethodSelector onClick={() => setShowPaymentDropdown(!showPaymentDropdown)}>
              {selectedOption && (
                <TokenIconStack>
                  {selectedOption.amount.display?.iconUrl && (
                    <TokenIconPrimary
                      src={selectedOption.amount.display.iconUrl}
                      alt={selectedOption.amount.display?.assetSymbol || 'Token'}
                    />
                  )}
                  {selectedOption.amount.display?.networkIconUrl && (
                    <TokenIconSecondary
                      src={selectedOption.amount.display.networkIconUrl}
                      alt={selectedOption.amount.display?.networkName || 'Network'}
                    />
                  )}
                </TokenIconStack>
              )}
              <PaymentInfoValue>
                {selectedOption
                  ? `${formatAmount(selectedOption.amount.value, selectedOption.amount.display?.decimals || 18)} ${selectedOption.amount.display?.assetSymbol || ''}`
                  : 'Select payment method'}
              </PaymentInfoValue>
              <KeyboardArrowDownIcon sx={{ fontSize: 20, color: '#666' }} />
            </PaymentMethodSelector>

            {showPaymentDropdown && options.length > 0 && (
              <PaymentMethodDropdown>
                {options.map(option => {
                  const insufficient = isInsufficientBalance(option)
                  return (
                    <PaymentOptionCard
                      key={option.id}
                      selected={selectedOption?.id === option.id}
                      onClick={() => handleSelectOption(option)}
                    >
                      <TokenIconStack>
                        {option.amount.display?.iconUrl ? (
                          <TokenIconPrimary
                            src={option.amount.display.iconUrl}
                            alt={option.amount.display?.assetSymbol || 'Token'}
                          />
                        ) : (
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Text css={{ color: 'white', fontSize: '12px' }}>
                              {option.amount.display?.assetSymbol?.charAt(0) || '?'}
                            </Text>
                          </div>
                        )}
                        {option.amount.display?.networkIconUrl && (
                          <TokenIconSecondary
                            src={option.amount.display.networkIconUrl}
                            alt={option.amount.display?.networkName || 'Network'}
                          />
                        )}
                      </TokenIconStack>
                      <PaymentOptionInfo>
                        <PaymentOptionAmount>
                          {formatAmount(option.amount.value, option.amount.display?.decimals || 18)}{' '}
                          {option.amount.display?.assetSymbol || 'Token'}
                        </PaymentOptionAmount>
                        <PaymentOptionChain>
                          on {option.amount.display?.networkName || 'Unknown Network'}
                          {option.etaS > 0 && (
                            <EtaBadge>{formatEta(option.etaS)}</EtaBadge>
                          )}
                        </PaymentOptionChain>
                      </PaymentOptionInfo>
                      <div style={{ textAlign: 'right' }}>
                        <PaymentOptionBalance insufficient={insufficient}>
                          Bal: {getBalanceDisplay(option.id)}
                        </PaymentOptionBalance>
                        {selectedOption?.id === option.id && (
                          <CheckCircleIcon sx={{ fontSize: 16, color: '#17C964', marginTop: '2px' }} />
                        )}
                      </div>
                    </PaymentOptionCard>
                  )
                })}
              </PaymentMethodDropdown>
            )}
          </PaymentInfoRow>

          <PayButton onClick={onConfirm} disabled={!selectedOption || isProcessing}>
            {isProcessing ? 'Processing...' : `Pay ${formattedPaymentAmount}`}
          </PayButton>
        </PaymentInfoContainer>
      </Modal.Body>
    </Fragment>
  )
}
