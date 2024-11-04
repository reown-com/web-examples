import {
  ErrorResponse,
  GetCallsStatusParams,
  GetCallsStatusReturnValue,
  PrepareCallsParams,
  PrepareCallsReturnValue,
  SendPreparedCallsParams,
  SendPreparedCallsReturnValue
} from '@/lib/smart-accounts/builders/UserOpBuilder'
import { getChainById } from '@/utils/ChainUtil'
import { PIMLICO_NETWORK_NAMES } from '@/utils/SmartAccountUtil'
import { getUserOpBuilder } from '@/utils/UserOpBuilderUtil'
import { NextApiRequest, NextApiResponse } from 'next'
import { ENTRYPOINT_ADDRESS_V07 } from 'permissionless'
import { createPimlicoBundlerClient } from 'permissionless/clients/pimlico'
import { http, toHex } from 'viem'

type JsonRpcRequest = {
  jsonrpc: '2.0'
  id: number | string
  method: string
  params: any[]
}

type JsonRpcResponse<T> = {
  jsonrpc: '2.0'
  id: number | string | null
  result?: T
  error?: {
    code: number
    message: string
    data?: any
  }
}

type SupportedMethods = 'wallet_prepareCalls' | 'wallet_sendPreparedCalls' | 'wallet_getCallsStatus'
const ERROR_CODES = {
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32000
}

function createErrorResponse(
  id: number | string | null,
  code: number,
  message: string,
  data?: any
): JsonRpcResponse<never> {
  return {
    jsonrpc: '2.0',
    id,
    error: { code, message, data }
  }
}

async function handlePrepareCalls(
  projectId: string,
  params: PrepareCallsParams[]
): Promise<PrepareCallsReturnValue> {
  const [data] = params
  const chainId = parseInt(data.chainId, 16)
  const account = data.from
  const chain = getChainById(chainId)
  const builder = await getUserOpBuilder({ account, chain })
  return builder.prepareCalls(projectId, data)
}

async function handleSendPreparedCalls(
  projectId: string,
  params: SendPreparedCallsParams[]
): Promise<SendPreparedCallsReturnValue> {
  const [data] = params
  const chainId = parseInt(data.preparedCalls.chainId, 16)
  const account = data.preparedCalls.data.sender
  const chain = getChainById(chainId)
  const builder = await getUserOpBuilder({ account, chain })
  return builder.sendPreparedCalls(projectId, data)
}

async function handleGetCallsStatus(
  projectId: string,
  params: GetCallsStatusParams[]
): Promise<GetCallsStatusReturnValue> {
  const [userOpIdentifier] = params
  const chainId = userOpIdentifier.split(':')[0]
  const userOpHash = userOpIdentifier.split(':')[1]
  const chain = getChainById(parseInt(chainId, 16))
  const pimlicoChainName = PIMLICO_NETWORK_NAMES[chain.name]
  const apiKey = process.env.NEXT_PUBLIC_PIMLICO_KEY
  const localBundlerUrl = process.env.NEXT_PUBLIC_LOCAL_BUNDLER_URL
  const bundlerUrl = localBundlerUrl || `https://api.pimlico.io/v1/${pimlicoChainName}/rpc?apikey=${apiKey}`
  const bundlerClient = createPimlicoBundlerClient({
    entryPoint: ENTRYPOINT_ADDRESS_V07,
    transport: http(bundlerUrl)
  })
  const userOpReceipt = await bundlerClient.getUserOperationReceipt({
    hash: userOpHash as `0x${string}`
  })
  const receipt: GetCallsStatusReturnValue = {
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
  return receipt

}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    JsonRpcResponse<PrepareCallsReturnValue[] | SendPreparedCallsReturnValue[] | GetCallsStatusReturnValue[] | ErrorResponse>
  >
) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res
      .status(405)
      .json(createErrorResponse(null, ERROR_CODES.INVALID_REQUEST, 'Invalid Request'))
  }

  const jsonRpcRequest: JsonRpcRequest = req.body
  const { id, method, params } = jsonRpcRequest
  if (!['wallet_prepareCalls', 'wallet_sendPreparedCalls', 'wallet_getCallsStatus'].includes(method)) {
    return res
      .status(200)
      .json(createErrorResponse(id, ERROR_CODES.METHOD_NOT_FOUND, `${method} method not found`))
  }

  const projectId = req.query.projectId as string
  if (!projectId) {
    return res
      .status(200)
      .json(createErrorResponse(id, ERROR_CODES.INVALID_PARAMS, 'Invalid projectId'))
  }

  try {
    let response: PrepareCallsReturnValue | SendPreparedCallsReturnValue | GetCallsStatusReturnValue

    switch (method as SupportedMethods) {
      case 'wallet_prepareCalls':
        response = await handlePrepareCalls(projectId, params as PrepareCallsParams[])
        return res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: [response] as PrepareCallsReturnValue[]
        })

      case 'wallet_sendPreparedCalls':
        response = await handleSendPreparedCalls(projectId, params as SendPreparedCallsParams[])
        return res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: [response] as SendPreparedCallsReturnValue[]
        })

      case 'wallet_getCallsStatus':
        response = await handleGetCallsStatus(projectId, params as GetCallsStatusParams[])
        return res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: [response] as GetCallsStatusReturnValue[]
        })

      default:
        throw new Error(`Unsupported method: ${method}`)
    }
  } catch (error: any) {
    console.error(error)
    return res
      .status(200)
      .json(
        createErrorResponse(
          id,
          ERROR_CODES.INTERNAL_ERROR,
          `${method}: Internal error`,
          error.message
        )
      )
  }
}
