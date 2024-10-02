import {
  ErrorResponse,
  PrepareCallsParams,
  PrepareCallsReturnValue,
  SendPreparedCallsParams,
  SendPreparedCallsReturnValue
} from '@/lib/smart-accounts/builders/UserOpBuilder'
import { getChainById } from '@/utils/ChainUtil'
import { getUserOpBuilder } from '@/utils/UserOpBuilderUtil'
import { NextApiRequest, NextApiResponse } from 'next'

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

type SupportedMethods = 'wallet_prepareCalls' | 'wallet_sendPreparedCalls'

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    JsonRpcResponse<PrepareCallsReturnValue[] | SendPreparedCallsReturnValue[] | ErrorResponse>
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

  if (!['wallet_prepareCalls', 'wallet_sendPreparedCalls'].includes(method)) {
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
    let response: PrepareCallsReturnValue | SendPreparedCallsReturnValue

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
