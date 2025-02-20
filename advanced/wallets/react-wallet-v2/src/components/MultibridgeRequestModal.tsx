import { useCallback, useEffect, useMemo, useState } from 'react'
import { Avatar, Col, Row, Text } from '@nextui-org/react'
import { LoaderProps } from '@/components/ModalFooter'
import RequestModal from './RequestModal'
import ModalStore from '@/store/ModalStore'
import { styledToast } from '@/utils/HelperUtil'
import {
  convertTokenBalance,
  decodeErc20Transaction,
  getAssetByContractAddress,
  getErc20TokenBalance
} from '@/utils/MultibridgeUtil'
import { getWalletByAddress } from '@/utils/EIP155WalletUtil'
import { walletkit } from '@/utils/WalletConnectUtil'
import { EIP155_CHAINS, TEIP155Chain } from '@/data/EIP155Data'
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import { ChainAbstractionTypes } from '@reown/walletkit'
import { Hex } from 'viem'
import BridgeBadge from './BridgeBadge'
import { privateKeyToAccount } from 'viem/accounts'

interface IProps {
  onReject: () => void
  rejectLoader?: LoaderProps
  bridgeDetails: ChainAbstractionTypes.UiFields
}

export default function MultibridgeRequestModal({ onReject, rejectLoader, bridgeDetails }: IProps) {
  const [isLoadingApprove, setIsLoadingApprove] = useState<boolean>(false)
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({})
  const transaction = bridgeDetails.initial.transaction
  console.log('bridgeDetails', bridgeDetails)
  const bridgingTransactions = bridgeDetails.route.map(route => route)
  const orchestrationId = bridgeDetails.routeResponse.orchestrationId
  const totalFee = bridgeDetails.localTotal.formattedAlt
  const initialTransactionMetadata = bridgeDetails.routeResponse.metadata.initialTransaction
  const fundingFrom = bridgeDetails.routeResponse.metadata.fundingFrom
  console.log('transactions', bridgingTransactions)

  const eip155ChainFundsDestination = transaction?.chainId

  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent
  const requestSession = ModalStore.state.data?.requestSession

  const params = requestEvent?.params

  const request = params?.request

  const bridgeFunds = async (
    bridgeSignedTransactions: string[],
    initialSignedTransaction: string
  ) => {
    return await walletkit.chainAbstraction.execute({
      orchestrationId,
      bridgeSignedTransactions,
      initialSignedTransaction
    })
  }

  useEffect(() => {
    console.log('Initial transaction', initialTransactionMetadata)
    const fetchTokenBalance = async (tokenAddress: string) => {
      const tokenBalance = await getErc20TokenBalance(
        tokenAddress as Hex,
        Number(transaction.chainId.split(':')[1]),
        transaction?.from as Hex
      )
      console.log('Token balance', tokenBalance)
      setTokenBalances(prevState => ({
        ...prevState,
        [tokenAddress]: tokenBalance
      }))
    }
    fetchTokenBalance(initialTransactionMetadata.tokenContract)
  }, [])

  const onApprove = useCallback(async (): Promise<void> => {
    if (requestEvent) {
      const topic = requestEvent.topic
      const id = requestEvent.id
      setIsLoadingApprove(true)
      try {
        console.log('Approving request', transaction)
        const loadedWallet = getWalletByAddress(transaction.from)
        const account = privateKeyToAccount(loadedWallet.getPrivateKey() as Hex)
        // const account = mnemonicToAccount(loadedWallet.getMnemonic())
        console.log('Account', account)

        console.log('Connected wallet', account)
        const bridgeSignedTransactions = []
        for (const route of bridgeDetails.route) {
          const message = route.transactionHashToSign
          const signature = await account.sign({ hash: message })
          bridgeSignedTransactions.push(signature)
          console.log('Signed bridge transaction', {
            message,
            signature,
            address: account.address
          })
        }

        const message = bridgeDetails.initial.transactionHashToSign
        const initialSignedTransaction = await account.sign({
          hash: message
        })

        console.log('Signed initial transaction', {
          message,
          signature: initialSignedTransaction,
          address: account.address
        })
        const result = await bridgeFunds(bridgeSignedTransactions, initialSignedTransaction)

        await walletkit.respondSessionRequest({
          topic,
          response: formatJsonRpcResult(id, result.initialTxnHash)
        })
        ModalStore.close()
      } catch (e) {
        const { id } = requestEvent
        const errorMessage = (e as Error).message || 'Error bridging funds'
        const response = formatJsonRpcError(id, errorMessage)
        await walletkit.respondSessionRequest({
          topic,
          response
        })
        styledToast((e as Error).message, 'error')
        console.error(e)
      } finally {
        setIsLoadingApprove(false)
      }
    }
  }, [bridgeDetails, bridgeFunds])

  if (!request || !requestSession || !bridgingTransactions || bridgingTransactions.length === 0) {
    return <Text>Request not found</Text>
  }

  const transfer = decodeErc20Transaction(request.params[0])
  if (!transfer) {
    return <Text>Invalid transfer request</Text>
  }

  const asset = getAssetByContractAddress(transfer.contract)
  const amount = convertTokenBalance(asset, transfer.amount)
  const destination = transfer.to
  const targetChain = EIP155_CHAINS[eip155ChainFundsDestination as TEIP155Chain]

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  function hexToDecimal(hex: string, decimals: number, toFixed?: number): string {
    // Convert hex to decimal
    const decimalValue = parseInt(hex, 16)

    // Apply decimal places
    return (decimalValue / Math.pow(10, decimals)).toFixed(toFixed || decimals)
  }

  return (
    <RequestModal
      intention="Multibridge"
      metadata={requestSession.peer.metadata}
      onApprove={onApprove}
      onReject={onReject}
      approveLoader={{ active: isLoadingApprove }}
      rejectLoader={rejectLoader}
      disableThreatDetection={true}
    >
      <div style={{ background: '#252525', borderRadius: 25, padding: 1, marginTop: 10 }}>
        <div style={{ margin: 8 }}>
          <Row style={{ marginBottom: 10 }}>
            <Col>Sending</Col>
            <Col data-testid="request-details-chain" style={{ textAlign: 'end' }}>
              {/* <Text
              color=""
              // css={{ paddingTop: '$6', paddingBottom: '$6' }}
            > */}
              {amount} {asset}
              {/* </Text> */}
              {/* <Text color="$gray400" data-testid="request-details-chain" size="sm">
              {destination}
            </Text> */}
            </Col>
          </Row>
          <Row
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 10
            }}
          >
            <Col>To</Col>
            <Col style={{ textAlign: 'end' }}>{formatAddress(destination)}</Col>
          </Row>
          <Row
            style={{
              background: '#2A2A2A',
              borderRadius: 25,
              padding: 10,
              paddingLeft: 5,
              paddingRight: 5
            }}
          >
            <Col>
              <Text style={{ marginBottom: 10 }} h5>
                Source of funds
              </Text>

              <Row align="center">
                <Col>
                  <Row align="center">
                    <Avatar size="sm" src={targetChain.logo} style={{ marginRight: 5 }} />
                    Balance
                  </Row>
                </Col>
                <Col style={{ textAlign: 'end' }}>
                  ~{tokenBalances[initialTransactionMetadata.tokenContract]}{' '}
                  {initialTransactionMetadata.symbol}
                </Col>
              </Row>
              {fundingFrom?.map((funding, i) => {
                return (
                  <Row align="center" key={i}>
                    <Col>
                      <Row align="center">
                        <BridgeBadge /> Bridging
                      </Row>
                    </Col>
                    <Col style={{ textAlign: 'end' }}>
                      ~{hexToDecimal(funding.amount, funding.decimals, 2)} {funding.symbol}
                      <Row align="center" style={{ justifyContent: 'end', marginRight: 0 }}>
                        from {EIP155_CHAINS[funding.chainId as TEIP155Chain]?.name}
                        <Avatar
                          style={{ marginLeft: 5 }}
                          size="xs"
                          src={EIP155_CHAINS[funding.chainId as TEIP155Chain]?.logo}
                        />
                      </Row>
                    </Col>
                  </Row>
                )
              })}
            </Col>
          </Row>
        </div>
      </div>
      <div style={{ background: '#252525', borderRadius: 25, padding: 1, marginTop: 10 }}>
        <div style={{ margin: 8 }}>
          <Row style={{ marginBottom: 10 }}>
            <Row>
              <Col span={2}>App</Col>
              <Col style={{ textAlign: 'end', fontSize: 12 }}>
                <a href={requestSession.peer.metadata.url} target="_blank" rel="noreferrer">
                  {requestSession.peer.metadata.url}
                </a>
              </Col>
            </Row>
          </Row>
          <Row style={{ marginBottom: 10 }}>
            <Row>
              <Col>Network</Col>
              <Col style={{ alignContent: 'end', fontSize: 15 }}>
                <Row align="center" style={{ justifyContent: 'end' }}>
                  <Avatar size="xs" src={targetChain.logo} style={{ marginRight: 5 }} />{' '}
                  {targetChain.name}
                </Row>
              </Col>
            </Row>
          </Row>
          <Row
            style={{
              background: '#2A2A2A',
              borderRadius: 25,
              padding: 10,
              paddingLeft: 5,
              paddingRight: 5
            }}
          >
            <Row>
              <Col>Estimated Fees</Col>
              <Col style={{ textAlign: 'end' }}>~{totalFee}</Col>
            </Row>
          </Row>
        </div>
      </div>
    </RequestModal>
  )
}
