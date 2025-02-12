import { useCallback, useEffect, useMemo, useState } from 'react'
import { Avatar, Col, Row, Text } from '@nextui-org/react'
import { LoaderProps } from '@/components/ModalFooter'
import RequestModal from './RequestModal'
import ModalStore from '@/store/ModalStore'
import { styledToast } from '@/utils/HelperUtil'
import { approveEIP155Request } from '@/utils/EIP155RequestHandlerUtil'
import {
  convertTokenBalance,
  decodeErc20Transaction,
  getAssetByContractAddress,
  getErc20TokenBalance
} from '@/utils/MultibridgeUtil'
import { getWallet } from '@/utils/EIP155WalletUtil'
import { walletkit } from '@/utils/WalletConnectUtil'
import { EIP155_CHAINS, TEIP155Chain } from '@/data/EIP155Data'
import { ChainAbstractionService, Transaction } from '@/utils/ChainAbstractionService'
import { providers } from 'ethers'
import { formatJsonRpcError } from '@json-rpc-tools/utils'
import { ChainAbstractionTypes } from '@reown/walletkit'
import { Hex } from 'viem'
import BridgeBadge from './BridgeBadge'

interface IProps {
  onReject: () => void
  transactions?: Transaction[]
  initialTransaction: Transaction
  orchestrationId: string
  rejectLoader?: LoaderProps
  fundings: ChainAbstractionTypes.FundingFrom[]
  initialTransactionMetadata: ChainAbstractionTypes.InitialTransactionMetadata
}

export default function MultibridgeRequestModal({
  transactions,
  initialTransaction,
  orchestrationId,
  onReject,
  rejectLoader,
  fundings,
  initialTransactionMetadata
}: IProps) {
  const [isLoadingApprove, setIsLoadingApprove] = useState<boolean>(false)

  const [bridgingTransactions, setBridgingTransactions] = useState<Transaction[]>([])
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({})
  const [totalFee, setTotalFee] = useState<string>('')
  const [transaction, setTransaction] = useState<Transaction | null>(initialTransaction)
  console.log('transactions', transactions)
  // const bridgingTransactions = transactions

  const eip155ChainsFundsSourcedFrom = bridgingTransactions
    ? new Set(bridgingTransactions.map(transaction => transaction.chainId))
    : new Set<TEIP155Chain>()

  const eip155ChainFundsDestination = initialTransaction?.chainId

  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent
  const requestSession = ModalStore.state.data?.requestSession

  const topic = requestEvent?.topic
  const params = requestEvent?.params

  const request = params?.request

  useMemo(async () => {
    if (!orchestrationId) {
      return null
    }
    const details = await walletkit.getFulfilmentDetails({ fulfilmentId: orchestrationId })
    // const details = {
    //   routeDetails: [
    //     {
    //       transaction: {
    //         chainId: 'eip155:8453',
    //         from: '0x13a2ff792037aa2cd77fe1f4b522921ac59a9c52',
    //         to: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    //         value: '0x0',
    //         input:
    //           '0x095ea7b30000000000000000000000003a23f943181408eac424116af7b7790c94cb97a50000000000000000000000000000000000000000000000000000000000225928',
    //         gasLimit: '0x1b760',
    //         nonce: '0x17',
    //         maxFeePerGas: '0xd5d732',
    //         maxPriorityFeePerGas: '0xf4240'
    //       },
    //       transactionFee: {
    //         fee: {
    //           symbol: 'ETH',
    //           amount: '0x171c8892672',
    //           unit: 18,
    //           formatted: '0.000001588207363698 ETH',
    //           formatted_alt: '<$0.01'
    //         },
    //         localFee: {
    //           symbol: 'USD',
    //           amount: '0x6b62af154a82c7301f20',
    //           unit: 26,
    //           formatted: '0.00507113610658132270260000 USD',
    //           formatted_alt: '$0.01'
    //         }
    //       }
    //     },
    //     {
    //       transaction: {
    //         chainId: 'eip155:8453',
    //         from: '0x13a2ff792037aa2cd77fe1f4b522921ac59a9c52',
    //         to: '0x3a23f943181408eac424116af7b7790c94cb97a5',
    //         value: '0x0',
    //         input:
    //           '0x0000019b792ebcb90000000000000000000000000000000000000000000000000000000000225928000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001e00000000000000000000000000000000000000000000000000000000000001c2f0000000000000000000000000000000000000000000000000000000000001b3b000000000000000000000000000000000000000000000000000000000000000200000000000000000000000013a2ff792037aa2cd77fe1f4b522921ac59a9c5200000000000000000000000013a2ff792037aa2cd77fe1f4b522921ac59a9c520000000000000000000000000000000000000000000000000000000000000002000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e583100000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000223cf9000000000000000000000000000000000000000000000000000000000000a4b1000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000679b390b00000000000000000000000000000000000000000000000000000000679b8d11d00dfeeddeadbeef765753be7f7a64d5509974b0d678e1e3149b02f4',
    //         gasLimit: '0x1a584',
    //         nonce: '0x18',
    //         maxFeePerGas: '0xd5d732',
    //         maxPriorityFeePerGas: '0xf4240'
    //       },
    //       transactionFee: {
    //         fee: {
    //           symbol: 'ETH',
    //           amount: '0x166e7abc8ce',
    //           unit: 18,
    //           formatted: '0.000001541485086926 ETH',
    //           formatted_alt: '<$0.01'
    //         },
    //         localFee: {
    //           symbol: 'USD',
    //           amount: '0x6839f4c8807ec111d4e0',
    //           unit: 26,
    //           formatted: '0.00492195217119867036620000 USD',
    //           formatted_alt: '<$0.01'
    //         }
    //       }
    //     }
    //   ],
    //   initialTransactionDetails: {
    //     transaction: {
    //       chainId: 'eip155:42161',
    //       from: '0x13a2ff792037aa2cd77fe1f4b522921ac59a9c52',
    //       to: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    //       value: '0x0',
    //       input:
    //         '0xa9059cbb00000000000000000000000013a2ff792037aa2cd77fe1f4b522921ac59a9c5200000000000000000000000000000000000000000000000000000000003d0900',
    //       gasLimit: '0x1913a',
    //       nonce: '0x4b',
    //       maxFeePerGas: '0x1312d01',
    //       maxPriorityFeePerGas: '0x1'
    //     },
    //     transactionFee: {
    //       fee: {
    //         symbol: 'ETH',
    //         amount: '0x1de4ca2c33a',
    //         unit: 18,
    //         formatted: '0.000002054280102714 ETH',
    //         formatted_alt: '<$0.01'
    //       },
    //       localFee: {
    //         symbol: 'USD',
    //         amount: '0x8ad02fd36877a3207d80',
    //         unit: 26,
    //         formatted: '0.00655526943616345542000000 USD',
    //         formatted_alt: '$0.01'
    //       }
    //     }
    //   },
    //   bridgeDetails: [
    //     {
    //       fee: {
    //         symbol: 'USDC',
    //         amount: '0xb729d',
    //         unit: 6,
    //         formatted: '0.750237 USDC',
    //         formatted_alt: '$0.75'
    //       },
    //       localFee: {
    //         symbol: 'USD',
    //         amount: '0x444cf6c826fb',
    //         unit: 14,
    //         formatted: '0.75097348515579 USD',
    //         formattedAlt: '$0.75'
    //       }
    //     }
    //   ],
    //   totalFee: {
    //     symbol: 'USD',
    //     amount: '0x3f7ce83f5225a6a9992180',
    //     unit: 26,
    //     formatted: '0.76752184286973344848880000 USD',
    //     formattedAlt: '$0.77'
    //   }
    // }
    console.log('details', details)
    setTotalFee(details.totalFee.formattedAlt)
    setTransaction({
      ...details.initialTransactionDetails.transaction,
      data: details.initialTransactionDetails.transaction.input
    })
    setBridgingTransactions(
      details.routeDetails.map(route => ({
        ...route.transaction,
        data: route.transaction.input
      }))
    )
  }, [orchestrationId])

  const bridgeFunds = useCallback(async (): Promise<void> => {
    if (!bridgingTransactions) {
      throw new Error('bridgingTransactions are unavailable')
    }

    const wallet = await getWallet(params)
    console.log(
      'Bridge funds from',
      eip155ChainsFundsSourcedFrom,
      'to',
      eip155ChainFundsDestination
    )

    for (const transaction of bridgingTransactions) {
      console.log('Bridging transaction', transaction)
      const chainId = transaction.chainId
      const chainProvider = new providers.JsonRpcProvider(
        EIP155_CHAINS[chainId as TEIP155Chain].rpc
      )
      const chainConnectedWallet = await wallet.connect(chainProvider)
      const walletAddress = wallet.getAddress()
      console.log('Connected wallet address', chainConnectedWallet)
      const txResponse = await chainConnectedWallet.sendTransaction({
        from: walletAddress,
        to: transaction.to,
        value: transaction.value,
        data: transaction.data,
        nonce: transaction.nonce,
        maxFeePerGas: transaction.maxFeePerGas,
        maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
        gasLimit: transaction.gasLimit
      })
      const txHash = typeof txResponse === 'string' ? txResponse : txResponse?.hash
      const txReceipt = await txResponse.wait()
      console.log('Transaction receipt', txReceipt)
      const txStatus = txReceipt.status
      console.log(
        `Transaction broadcasted on chain ${chainId} , ${{ txHash }}, status: ${txStatus}`
      )
    }
  }, [bridgingTransactions, orchestrationId, onReject, params])

  const fetchTokenBalance = async (chainId: string, tokenAddress: string) => {
    const tokenBalance = await getErc20TokenBalance(
      tokenAddress as Hex,
      Number(chainId.split(':')[1]),
      initialTransaction?.from as Hex
    )
    console.log('Token balance', tokenBalance)
    setTokenBalances(prevState => ({
      ...prevState,
      [tokenAddress]: tokenBalance
    }))
  }

  useEffect(() => {
    console.log('Initial transaction', initialTransaction?.chainId)
    if (initialTransactionMetadata) {
      console.log('Fetching token balance for', initialTransaction.to)
      fetchTokenBalance(initialTransaction.chainId, initialTransactionMetadata.tokenContract)
    }
  }, [initialTransactionMetadata])

  const onApprove = useCallback(async (): Promise<void> => {
    if (requestEvent && topic) {
      setIsLoadingApprove(true)
      try {
        performance.mark('startInititalTransactionSend')
        await bridgeFunds()
        const response = await approveEIP155Request({
          ...requestEvent,
          params: {
            ...requestEvent.params,
            request: {
              ...requestEvent.params.request,
              params: {
                ...transaction
              }
            }
          }
        })
        performance.mark('endInititalTransactionSend')
        console.log(
          `Initial transaction send: ${
            performance.measure(
              'initial-tx-send',
              'startInititalTransactionSend',
              'endInititalTransactionSend'
            ).duration
          } ms`
        )

        await walletkit.respondSessionRequest({ topic, response })
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
      ModalStore.close()
    }
  }, [bridgeFunds, requestEvent, topic])

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
              {fundings?.map((funding, i) => {
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
