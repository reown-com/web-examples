import { useState, useEffect, useRef, useCallback } from 'react'
import { Text, Row, Container, Col, Card, Divider, Spacer } from '@nextui-org/react'
import { DetailedPaymentOption } from '@/types/wallet_checkout'
import TokenDropdown from './PaymentCheckout/TokenDropdown'
import NetworkDropdown from './PaymentCheckout/NetworkDropdown'
import SelectedPaymentDetails from './PaymentCheckout/SelectedPaymentDetails'

interface PayWithProps {
  payments: DetailedPaymentOption[]
  onSelectPayment?: (payment: DetailedPaymentOption) => void
}

// Define types for the enhanced token and network data
interface TokenWithNetworks {
  assetSymbol: string
  assetIcon: string
  assetName: string
  assetDecimals: number
  assetNamespace: string
  networks: string[]
}

interface NetworkWithTokens {
  chainId: string
  chainName: string
  chainNamespace: string
  chainIcon: string
  tokens: string[]
}

// Modified to extract tokens with network info
const extractTokensWithNetworks = (payments: DetailedPaymentOption[]): TokenWithNetworks[] => {
  const tokenMap = new Map()

  payments.forEach(payment => {
    const tokenKey = payment.assetMetadata.assetSymbol
    if (!tokenMap.has(tokenKey)) {
      tokenMap.set(tokenKey, {
        assetSymbol: payment.assetMetadata.assetSymbol,
        assetIcon: payment.assetMetadata.assetIcon,
        assetName: payment.assetMetadata.assetName,
        assetDecimals: payment.assetMetadata.assetDecimals,
        assetNamespace: payment.assetMetadata.assetNamespace,
        networks: new Set([payment.chainMetadata.chainId])
      })
    } else {
      // Add network to existing token's networks
      tokenMap.get(tokenKey).networks.add(payment.chainMetadata.chainId)
    }
  })

  // Convert sets to arrays for easier handling
  return Array.from(tokenMap.values()).map(token => ({
    ...token,
    networks: Array.from(token.networks)
  }))
}

// Modified to extract networks with token info
const extractNetworksWithTokens = (payments: DetailedPaymentOption[]): NetworkWithTokens[] => {
  const networkMap = new Map()

  payments.forEach(payment => {
    const networkKey = payment.chainMetadata.chainId
    if (!networkMap.has(networkKey)) {
      networkMap.set(networkKey, {
        chainId: payment.chainMetadata.chainId,
        chainName: payment.chainMetadata.chainName,
        chainNamespace: payment.chainMetadata.chainNamespace,
        chainIcon: payment.chainMetadata.chainIcon,
        tokens: new Set([payment.assetMetadata.assetSymbol])
      })
    } else {
      // Add token to existing network's tokens
      networkMap.get(networkKey).tokens.add(payment.assetMetadata.assetSymbol)
    }
  })

  // Convert sets to arrays for easier handling
  return Array.from(networkMap.values()).map(network => ({
    ...network,
    tokens: Array.from(network.tokens)
  }))
}

// Get filtered tokens based on selected network
const getFilteredTokens = (
  tokensWithNetworks: TokenWithNetworks[],
  selectedNetworkId?: string
): TokenWithNetworks[] => {
  if (!selectedNetworkId) return tokensWithNetworks
  return tokensWithNetworks.filter(token => token.networks.includes(selectedNetworkId))
}

// Get filtered networks based on selected token
const getFilteredNetworks = (
  networksWithTokens: NetworkWithTokens[],
  selectedTokenSymbol?: string
): NetworkWithTokens[] => {
  if (!selectedTokenSymbol) return networksWithTokens
  return networksWithTokens.filter(network => network.tokens.includes(selectedTokenSymbol))
}

export default function PayWith({ payments, onSelectPayment }: PayWithProps) {
  const allTokensWithNetworks = extractTokensWithNetworks(payments)
  const allNetworksWithTokens = extractNetworksWithTokens(payments)

  const initializedRef = useRef(false)

  const [selectedTokenIndex, setSelectedTokenIndex] = useState<number>(0)
  const [selectedNetworkIndex, setSelectedNetworkIndex] = useState<number>(0)

  const [selectedToken, setSelectedToken] = useState<TokenWithNetworks | null>(
    allTokensWithNetworks.length > 0 ? allTokensWithNetworks[0] : null
  )
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkWithTokens | null>(
    allNetworksWithTokens.length > 0 ? allNetworksWithTokens[0] : null
  )

  const [filteredTokens, setFilteredTokens] = useState<TokenWithNetworks[]>(allTokensWithNetworks)
  const [filteredNetworks, setFilteredNetworks] =
    useState<NetworkWithTokens[]>(allNetworksWithTokens)

  const [lastChanged, setLastChanged] = useState<'token' | 'network' | null>(null)

  const [selectedPayment, setSelectedPayment] = useState<DetailedPaymentOption | null>(null)

  const getFilteredTokensForNetwork = useCallback(
    (networkId: string | undefined) => {
      return getFilteredTokens(allTokensWithNetworks, networkId)
    },
    [allTokensWithNetworks]
  )

  const getFilteredNetworksForToken = useCallback(
    (tokenSymbol: string | undefined) => {
      return getFilteredNetworks(allNetworksWithTokens, tokenSymbol)
    },
    [allNetworksWithTokens]
  )

  useEffect(() => {
    if (lastChanged === 'network' && selectedNetwork) {
      const newFilteredTokens = getFilteredTokensForNetwork(selectedNetwork.chainId)

      // Only update if the filtered tokens actually changed
      if (JSON.stringify(newFilteredTokens) !== JSON.stringify(filteredTokens)) {
        setFilteredTokens(newFilteredTokens)

        // If current token is not available in this network, select the first available
        if (newFilteredTokens.length > 0) {
          const currentTokenIsValid =
            selectedToken &&
            newFilteredTokens.some(t => t.assetSymbol === selectedToken.assetSymbol)

          if (!currentTokenIsValid) {
            setSelectedToken(newFilteredTokens[0])
            setSelectedTokenIndex(0)
          } else if (selectedToken) {
            // Update the token index to match the new filtered list
            const newIndex = newFilteredTokens.findIndex(
              t => t.assetSymbol === selectedToken.assetSymbol
            )
            if (newIndex !== -1 && newIndex !== selectedTokenIndex) {
              setSelectedTokenIndex(newIndex)
            }
          }
        }
      }
    }
  }, [
    selectedNetwork,
    lastChanged,
    selectedToken,
    getFilteredTokensForNetwork,
    filteredTokens,
    selectedTokenIndex
  ])

  useEffect(() => {
    if (lastChanged === 'token' && selectedToken) {
      const newFilteredNetworks = getFilteredNetworksForToken(selectedToken.assetSymbol)

      // Only update if the filtered networks actually changed
      if (JSON.stringify(newFilteredNetworks) !== JSON.stringify(filteredNetworks)) {
        setFilteredNetworks(newFilteredNetworks)

        // If current network is not available for this token, select the first available
        if (newFilteredNetworks.length > 0) {
          const currentNetworkIsValid =
            selectedNetwork && newFilteredNetworks.some(n => n.chainId === selectedNetwork.chainId)

          if (!currentNetworkIsValid) {
            setSelectedNetwork(newFilteredNetworks[0])
            setSelectedNetworkIndex(0)
          } else if (selectedNetwork) {
            // Update the network index to match the new filtered list
            const newIndex = newFilteredNetworks.findIndex(
              n => n.chainId === selectedNetwork.chainId
            )
            if (newIndex !== -1 && newIndex !== selectedNetworkIndex) {
              setSelectedNetworkIndex(newIndex)
            }
          }
        }
      }
    }
  }, [
    selectedToken,
    lastChanged,
    selectedNetwork,
    getFilteredNetworksForToken,
    filteredNetworks,
    selectedNetworkIndex
  ])

  const handleSelectToken = (index: number) => {
    setSelectedTokenIndex(index)
    setSelectedToken(filteredTokens[index])
    setLastChanged('token')
  }

  const handleSelectNetwork = (index: number) => {
    setSelectedNetworkIndex(index)
    setSelectedNetwork(filteredNetworks[index])
    setLastChanged('network')
  }

  useEffect(() => {
    if (selectedToken && selectedNetwork && onSelectPayment) {
      const payment = payments.find(
        payment =>
          payment.assetMetadata.assetSymbol === selectedToken.assetSymbol &&
          payment.chainMetadata.chainId === selectedNetwork.chainId
      )

      if (payment) {
        setSelectedPayment(payment)
        onSelectPayment(payment)
      }
    }
  }, [selectedToken, selectedNetwork, onSelectPayment, payments])

  useEffect(() => {
    if (
      !initializedRef.current &&
      allTokensWithNetworks.length > 0 &&
      allNetworksWithTokens.length > 0
    ) {
      initializedRef.current = true

      const initialToken = allTokensWithNetworks[0]
      const initialNetwork = allNetworksWithTokens[0]

      setSelectedToken(initialToken)
      setSelectedNetwork(initialNetwork)
      setFilteredTokens(allTokensWithNetworks)
      setFilteredNetworks(allNetworksWithTokens)

      if (payments.length > 0) {
        const initialPayment = payments.find(
          payment =>
            payment.assetMetadata.assetSymbol === initialToken.assetSymbol &&
            payment.chainMetadata.chainId === initialNetwork.chainId
        )

        if (initialPayment) {
          setSelectedPayment(initialPayment)
          if (onSelectPayment) {
            onSelectPayment(initialPayment)
          }
        } else if (payments[0]) {
          setSelectedPayment(payments[0])
          if (onSelectPayment) {
            onSelectPayment(payments[0])
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <Container
        css={{
          borderRadius: '32px',
          padding: '16px',
          backgroundColor: 'var(--nextui-colors-accents1)'
        }}
      >
        <Col css={{ marginBottom: '16px' }}>
          <Text css={{ color: '$text', fontWeight: '600', fontSize: '14px', marginBottom: '8px' }}>
            Pay with
          </Text>
          <Row justify="space-between" align="center" css={{ width: '100%' }}>
            <TokenDropdown
              allTokens={allTokensWithNetworks}
              filteredTokens={filteredTokens}
              selectedTokenIndex={selectedTokenIndex}
              onSelectToken={handleSelectToken}
            />
          </Row>
        </Col>
        <Col>
          <Text css={{ color: '$text', fontWeight: '600', fontSize: '14px', marginBottom: '8px' }}>
            Network
          </Text>
          <Row justify="space-between" align="center" css={{ width: '100%' }}>
            <NetworkDropdown
              allNetworks={allNetworksWithTokens}
              filteredNetworks={filteredNetworks}
              selectedNetworkIndex={selectedNetworkIndex}
              onSelectNetwork={handleSelectNetwork}
            />
          </Row>
        </Col>

        <Spacer y={1} />

        {/* Display Selected Payment Option Details */}
        <SelectedPaymentDetails selectedPayment={selectedPayment} />
      </Container>
    </>
  )
}
