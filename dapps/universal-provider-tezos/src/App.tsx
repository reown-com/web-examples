import UniversalProvider from '@walletconnect/universal-provider'
import { WalletConnectModal } from '@walletconnect/modal'
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  signMessage,
  sendTransaction,
  TezosChainData,
  apiGetTezosAccountBalance,
  formatTezosBalance,
  getAccounts,
  getChainId,
  apiGetContractAddress,
  TezosSendResponse,
  TezosSignResponse,
  TezosGetAccountResponse
} from './utils/helpers'
import { SAMPLE_KINDS, SAMPLES } from './utils/samples'
import { ErrorObject } from '@walletconnect/utils'

const projectId = import.meta.env.VITE_PROJECT_ID

const rpcMap = {
  'tezos:mainnet': 'https://rpc.tzbeta.net',
  'tezos:testnet': 'https://rpc.ghostnet.teztnets.com'
}

const chains = ['tezos:mainnet', 'tezos:testnet']
const methods = ['tezos_getAccounts', 'tezos_sign', 'tezos_send']

const App = () => {
  const [provider, setProvider] = useState<UniversalProvider | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastKind, setLastKind] = useState<SAMPLE_KINDS | undefined>(undefined)
  const [result, setResult] = useState<
    TezosSendResponse | TezosSignResponse | TezosGetAccountResponse | ErrorObject | string | null
  >(null)
  const [description, setDescription] = useState<Record<string, unknown> | string | undefined>(
    undefined
  )
  const [balance, setBalance] = useState('')
  const [address, setAddress] = useState('')
  const [contractAddress, setContractAddress] = useState(
    '[click Origination to get contract address]'
  )

  const modal = useMemo(
    () =>
      new WalletConnectModal({
        projectId,
        chains
      }),
    []
  )

  // Initialize provider once when the component mounts
  useEffect(() => {
    const initializeProvider = async () => {
      const newProvider = await UniversalProvider.init({
        logger: 'debug',
        projectId,
        metadata: {
          name: 'WalletConnect @ Tezos',
          description: "Tezos integration with WalletConnect's Universal Provider",
          url: 'https://walletconnect.com/',
          icons: ['https://avatars.githubusercontent.com/u/37784886']
        }
      })

      // Event handlers for provider
      newProvider.on('display_uri', async (uri: string) => {
        console.log('event display_uri', uri)
        await modal.openModal({ uri })
      })

      newProvider.on('session_ping', ({ id, topic }: { id: string; topic: string }) => {
        console.log('Session Ping:', id, topic)
      })

      newProvider.on('session_event', ({ event, chainId }: { event: unknown; chainId: string }) => {
        console.log('Session Event:', event, chainId)
      })

      newProvider.on('session_delete', ({ id, topic }: { id: string; topic: string }) => {
        console.log('Session Delete:', id, topic)
        setIsConnected(false)
        setProvider(null)
      })

      setProvider(newProvider)
    }

    initializeProvider()
  }, [modal])

  // Fetch address once provider is set
  useEffect(() => {
    if (provider && provider.session) {
      const addr = provider.session.namespaces.tezos?.accounts[0]?.split(':')[2]
      setAddress(addr)
    }
  }, [provider])

  const connect = useCallback(async () => {
    try {
      if (provider) {
        await provider.connect({
          namespaces: {
            tezos: {
              methods,
              chains,
              events: []
            }
          },
          skipPairing: false
        })

        setIsConnected(true)
        console.log('Connected successfully. Provider', provider)

        const chainId = await getChainId('tezos:testnet')
        provider.setDefaultChain(chainId, rpcMap['tezos:testnet'])

        await getBalance()
      }
    } catch (error) {
      console.error('Connection error:', error)
    } finally {
      modal.closeModal()
    }
  }, [provider, modal])

  const disconnect = useCallback(async () => {
    if (provider) {
      await provider.disconnect()
      setIsConnected(false)
      setResult(null)
      setContractAddress('[click Origination to get contract address]')
      setBalance('')
    }
  }, [provider])

  const handleOp = useCallback(
    async (kind: SAMPLE_KINDS) => {
      if (!provider) return

      setLastKind(kind)
      setResult('Waiting for response from the Wallet...')

      try {
        let res = null
        switch (kind) {
          case SAMPLE_KINDS.GET_ACCOUNTS:
            res = await getAccounts(TezosChainData['testnet'].id, provider, address)
            break
          case SAMPLE_KINDS.SIGN:
            res = await signMessage(TezosChainData['testnet'].id, provider, address)
            break
          case SAMPLE_KINDS.SEND_TRANSACTION:
          case SAMPLE_KINDS.SEND_DELEGATION:
          case SAMPLE_KINDS.SEND_UNDELEGATION:
            res = await sendTransaction(
              TezosChainData['testnet'].id,
              provider,
              address,
              SAMPLES[kind]
            )
            break
          case SAMPLE_KINDS.SEND_ORGINATION:
            res = await sendTransaction(
              TezosChainData['testnet'].id,
              provider,
              address,
              SAMPLES[kind]
            )
            console.log('TezosRpc origination result: ', res)
            for (let attempt = 0; attempt < 10; attempt++) {
              const contractAddressList = await apiGetContractAddress(
                TezosChainData['testnet'].id,
                res.hash
              )
              if (contractAddressList.length > 0) {
                setContractAddress(contractAddressList[0])
                console.log('TezosRpc stored contract:', contractAddressList[0])
                break
              }
              console.log('Waiting for contract address...')
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
            if (!contractAddress) {
              setResult(`Indexer cannot find contract for op hash ${res.hash}`)
              return
            }
            break
          case SAMPLE_KINDS.SEND_CONTRACT_CALL:
          case SAMPLE_KINDS.SEND_INCREASE_PAID_STORAGE:
            res = await sendTransaction(TezosChainData['testnet'].id, provider, address, {
              ...SAMPLES[kind],
              destination: contractAddress
            })
            break
          case SAMPLE_KINDS.SEND_STAKE:
          case SAMPLE_KINDS.SEND_UNSTAKE:
          case SAMPLE_KINDS.SEND_FINALIZE:
            res = await sendTransaction(TezosChainData['testnet'].id, provider, address, {
              ...SAMPLES[kind],
              destination: address
            })
            break

          default:
            throw new Error(`Unsupported method ${kind}`)
        }
        setResult(res)
        console.log(res)
        await getBalance()
      } catch (error) {
        console.error(`Error sending ${kind}:`, error)
        setResult(error as ErrorObject)
      }
    },
    [provider, address]
  )

  const getBalance = useCallback(async () => {
    if (address) {
      const balance = await apiGetTezosAccountBalance(address, 'testnet')
      setBalance(formatTezosBalance(balance))
    }
  }, [address])

  const describe = (kind: SAMPLE_KINDS) => {
    switch (kind) {
      case SAMPLE_KINDS.SEND_TRANSACTION:
      case SAMPLE_KINDS.SEND_DELEGATION:
      case SAMPLE_KINDS.SEND_UNDELEGATION:
        setDescription(SAMPLES[kind])
        break
      case SAMPLE_KINDS.SEND_ORGINATION:
        setDescription(SAMPLES[kind] as unknown as Record<string, unknown>)
        break
      case SAMPLE_KINDS.SEND_CONTRACT_CALL:
      case SAMPLE_KINDS.SEND_INCREASE_PAID_STORAGE:
        setDescription({ ...SAMPLES[kind], destination: contractAddress })
        break
      case SAMPLE_KINDS.SEND_STAKE:
      case SAMPLE_KINDS.SEND_UNSTAKE:
      case SAMPLE_KINDS.SEND_FINALIZE:
        setDescription({ ...SAMPLES[kind], destination: address })
        break
      default:
        setDescription('No description available')
    }
  }

  const describeClear = () => {
    setDescription(undefined)
  }

  return (
    <div className="App">
      <h1>UniversalProvider</h1>
      <h2>WalletConnect for Tezos</h2>
      <p>dApp prototype integrating for Tezos Universal Provider.</p>

      {!projectId || projectId === 'YOUR_PROJECT_ID' ? (
        <div className="warning">
          <p>
            <b>The project is not initialized</b>
          </p>
          <p>Set your project ID in the .env file</p>
        </div>
      ) : isConnected ? (
        <>
          <p>
            <b>Public Key:</b> {address ?? 'No account connected'}
          </p>
          <p>
            <b>Balance:</b> {balance}
          </p>
          <p>
            <b>Contract Address:</b> {contractAddress}
          </p>
          <div className="layout-container">
            <div className="btn-container">
              <button onClick={disconnect} onMouseEnter={describeClear}>
                Disconnect
              </button>
              <button
                onClick={() => handleOp(SAMPLE_KINDS.GET_ACCOUNTS)}
                onMouseEnter={describeClear}
              >
                Get Accounts
              </button>
              <button onClick={() => handleOp(SAMPLE_KINDS.SIGN)} onMouseEnter={describeClear}>
                Sign
              </button>
              <button
                onClick={() => handleOp(SAMPLE_KINDS.SEND_TRANSACTION)}
                onMouseEnter={() => describe(SAMPLE_KINDS.SEND_TRANSACTION)}
              >
                Send Transaction
              </button>
              <button
                onClick={() => handleOp(SAMPLE_KINDS.SEND_DELEGATION)}
                onMouseEnter={() => describe(SAMPLE_KINDS.SEND_DELEGATION)}
              >
                Delegate
              </button>
              <button
                onClick={() => handleOp(SAMPLE_KINDS.SEND_UNDELEGATION)}
                onMouseEnter={() => describe(SAMPLE_KINDS.SEND_UNDELEGATION)}
              >
                Undelegate
              </button>
              <button
                onClick={() => handleOp(SAMPLE_KINDS.SEND_ORGINATION)}
                onMouseEnter={() => describe(SAMPLE_KINDS.SEND_ORGINATION)}
              >
                Originate
              </button>
              <button
                onClick={() => handleOp(SAMPLE_KINDS.SEND_CONTRACT_CALL)}
                onMouseEnter={() => describe(SAMPLE_KINDS.SEND_CONTRACT_CALL)}
              >
                Contract call
              </button>
              <button
                onClick={() => handleOp(SAMPLE_KINDS.SEND_STAKE)}
                onMouseEnter={() => describe(SAMPLE_KINDS.SEND_STAKE)}
              >
                Stake
              </button>
              <button
                onClick={() => handleOp(SAMPLE_KINDS.SEND_UNSTAKE)}
                onMouseEnter={() => describe(SAMPLE_KINDS.SEND_UNSTAKE)}
              >
                Unstake
              </button>
              <button
                onClick={() => handleOp(SAMPLE_KINDS.SEND_FINALIZE)}
                onMouseEnter={() => describe(SAMPLE_KINDS.SEND_FINALIZE)}
              >
                Finalize
              </button>
              <button
                onClick={() => handleOp(SAMPLE_KINDS.SEND_INCREASE_PAID_STORAGE)}
                onMouseEnter={() => describe(SAMPLE_KINDS.SEND_INCREASE_PAID_STORAGE)}
              >
                Increase paid storage
              </button>
            </div>
            <div className="result-column">
              {result && (
                <>
                  <p>Result of the last operation:</p>
                  <pre>{lastKind}</pre>
                  <pre>{JSON.stringify(result, null, 2)}</pre>
                </>
              )}
              {description && (
                <>
                  <p>Operation:</p>
                  <pre>{JSON.stringify(description, null, 2)}</pre>
                </>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <p>Connect your wallet to get started</p>
          <button onClick={connect}>Connect</button>
        </>
      )}
    </div>
  )
}

export default App
