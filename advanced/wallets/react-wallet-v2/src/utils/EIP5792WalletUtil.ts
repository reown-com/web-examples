import { eip155Addresses } from './EIP155WalletUtil'
import {
  CallReceipt,
  GetCallsParams,
  GetCallsResult,
  GetCapabilitiesResult,
  SendCallsParams,
  supportedEIP5792CapabilitiesForEOA,
  supportedEIP5792CapabilitiesForSCA
} from '@/data/EIP5792Data'
import { randomBytes } from 'crypto'
import { Wallet, ethers } from 'ethers'
import {
  ENTRYPOINT_ADDRESS_V06,
  GetUserOperationReceiptReturnType,
  createBundlerClient
} from 'permissionless'
import { Address, Hex, http, keccak256, toHex } from 'viem'

type BatchTransactionsLog = {
  calls: {
    to: Address
    value: bigint
    data: Hex
  }[]
  callReceipts: CallReceipt[]
}

export const EIP5792_BATCH_TXS_STORAGE_KEY: string = 'EIP5792_BATCH_TXS'

export function getWalletCapabilities(addresses: string[]) {
  const walletCapabilities: GetCapabilitiesResult = {}
  addresses.forEach(address => {
    const namespacesAddress = address.split(':')
    // address will be the last index element whether
    // its a simple address or namespace:chainId:address
    const addr = namespacesAddress[namespacesAddress.length - 1]

    // Determine the capabilities based on the address type
    const capabilities = eip155Addresses.includes(addr)
      ? supportedEIP5792CapabilitiesForEOA
      : supportedEIP5792CapabilitiesForSCA

    // Assign the capabilities to the address
    walletCapabilities[addr] = capabilities
  })
  return walletCapabilities
}

export const getCallsStatus = async (getCallParams: GetCallsParams) => {
  // First search batchTxId locally if not found checking with bundler

  const receiptFromLocal = getCallsReceiptFromLocal(getCallParams)
  if (receiptFromLocal != null) return receiptFromLocal

  /**
   * Not maintaining the data for calls bundled for SCW right now.
   * Getting directly from bundler the receipt on sepolia chain.
   */
  const apiKey = process.env.NEXT_PUBLIC_PIMLICO_KEY
  const bundlerClient = createBundlerClient({
    entryPoint: ENTRYPOINT_ADDRESS_V06,
    transport: http(`https://api.pimlico.io/v1/sepolia/rpc?apikey=${apiKey}`)
  })
  const userOpReceipt = (await bundlerClient.getUserOperationReceipt({
    hash: getCallParams as `0x${string}`
  })) as GetUserOperationReceiptReturnType | null
  const receiptFromBundler: GetCallsResult = {
    status: userOpReceipt ? 'CONFIRMED' : 'PENDING',
    receipts: userOpReceipt
      ? [
          {
            logs: userOpReceipt.logs.map(log => ({
              data: log.data,
              address: log.address,
              topics: log.topics
            })),
            blockHash: userOpReceipt.receipt.blockHash,
            blockNumber: toHex(userOpReceipt.receipt.blockNumber),
            gasUsed: toHex(userOpReceipt.actualGasUsed),
            transactionHash: userOpReceipt.receipt.transactionHash,
            status: userOpReceipt.success ? '0x1' : '0x0'
          }
        ]
      : undefined
  }
  return receiptFromBundler
}

export const getSendCallData = (sendCallParams: SendCallsParams) => {
  return sendCallParams.calls.map(call => ({
    to: call.to,
    value: BigInt(call.value || 0),
    data: call.data || '0x'
  }))
}

export async function sendBatchTransactionWithEOA(
  wallet: Wallet,
  args: {
    to: Address
    value: bigint
    data: Hex
  }[]
) {
  const newBatchTx: BatchTransactionsLog = { calls: args, callReceipts: [] }
  const batchId = getBatchId()

  let allBatchTxsData: Map<string, BatchTransactionsLog> = new Map()
  const storedBatchTxsData = localStorage.getItem(EIP5792_BATCH_TXS_STORAGE_KEY)
  if (storedBatchTxsData) {
    const batchTxLogsArray = JSON.parse(storedBatchTxsData) as [string, BatchTransactionsLog][]
    allBatchTxsData = new Map(batchTxLogsArray)
  }

  allBatchTxsData.set(batchId, newBatchTx)
  localStorage.setItem(
    EIP5792_BATCH_TXS_STORAGE_KEY,
    JSON.stringify(Array.from(allBatchTxsData.entries()))
  )

  executeBatchCalls(wallet, batchId, args)

  return batchId
}

async function executeBatchCalls(
  wallet: Wallet,
  batchId: string,
  calls: {
    to: Address
    value: bigint
    data: Hex
  }[]
) {
  const callReceipts: CallReceipt[] = []

  for (let index = 0; index < calls.length; index++) {
    const call = calls[index]

    const txResponse = await wallet.sendTransaction(call)
    // Execute the call after a 1.5-second delay
    await new Promise(resolve => setTimeout(resolve, 1500))
    const txReceipt = await txResponse.wait()

    const callReceipt: CallReceipt = {
      logs: txReceipt.logs.map(log => ({
        data: log.data as `0x${string}`,
        address: log.address as `0x${string}`,
        topics: log.topics as `0x${string}`[]
      })),
      blockHash: txReceipt.blockHash as `0x${string}`,
      blockNumber: toHex(txReceipt.blockNumber),
      gasUsed: toHex(txReceipt.cumulativeGasUsed.toString()),
      transactionHash: txReceipt.transactionHash as `0x${string}`,
      status: txReceipt.status ? '0x1' : '0x0'
    }

    callReceipts.push(callReceipt)
  }

  const newBatchTxs: BatchTransactionsLog = { calls: calls, callReceipts: callReceipts }
  const storedBatchTxLogs = localStorage.getItem(EIP5792_BATCH_TXS_STORAGE_KEY)
  let allBatchTxLogs: Map<string, BatchTransactionsLog> = new Map()

  if (storedBatchTxLogs) {
    const batchTxLogsArray = JSON.parse(storedBatchTxLogs) as [string, BatchTransactionsLog][]
    allBatchTxLogs = new Map(batchTxLogsArray)
  }

  allBatchTxLogs.set(batchId, newBatchTxs)
  localStorage.setItem(
    EIP5792_BATCH_TXS_STORAGE_KEY,
    JSON.stringify(Array.from(allBatchTxLogs.entries()))
  )
}

async function getCallsReceiptFromLocal(
  getCallParams: GetCallsParams
): Promise<GetCallsResult | null> {
  const storedBatchTxsData = localStorage.getItem(EIP5792_BATCH_TXS_STORAGE_KEY)
  if (!storedBatchTxsData) return null

  const allBatchTxsData = new Map(
    JSON.parse(storedBatchTxsData) as [string, BatchTransactionsLog][]
  )
  const batchTxData = allBatchTxsData.get(getCallParams)
  if (!batchTxData || !batchTxData.calls) return null

  const { calls, callReceipts } = batchTxData
  if (callReceipts === undefined || calls.length !== callReceipts.length) {
    return { status: 'PENDING' }
  }

  return { status: 'CONFIRMED', receipts: callReceipts }
}

function getBatchId() {
  const timestamp = Date.now()
  return keccak256(
    ethers.utils.concat([ethers.utils.arrayify(randomBytes(32)), ethers.utils.arrayify(timestamp)])
  )
}
