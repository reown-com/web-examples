import axios, { Method, AxiosError } from 'axios'
import { UserOperationWithBigIntAsHex } from './UserOpBuilder'
import { bigIntReplacer } from '@/utils/HelperUtil'
import { COSIGNER_BASE_URL } from '@/utils/ConstantsUtil'
import { SmartSessionGrantPermissionsRequest } from '@reown/appkit-experimental/smart-session'

//--Cosigner Types----------------------------------------------------------------------- //
export type AddPermissionRequest = SmartSessionGrantPermissionsRequest

export type AddPermissionResponse = {
  pci: string
  key: {
    type: KeyType
    publicKey: `0x${string}`
  }
}

export type ActivatePermissionsRequest = {
  pci: string
  context: `0x${string}`
} & AddPermissionRequest

type RevokePermissionRequest = {
  pci: string
  signature: string
}

type CoSignRequest = {
  pci: string
  userOp: UserOperationWithBigIntAsHex
}

type CoSignResponse = {
  signature: `0x${string}`
}

type GetPermissionsContextRequest = {
  pci: string
}

type GetPermissionsContextResponse = {
  context: `0x${string}`
}

type GetPermissionsResponse = {
  pci: string[]
}

// -- Custom Error Class --------------------------------------------------- //
export class CoSignerApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'CoSignerApiError'
  }
}

// -- Helper Function for API Requests ------------------------------------- //
export async function sendCoSignerRequest<
  TRequest,
  TResponse,
  TQueryParams extends Record<string, string>
>({
  url,
  method,
  request,
  queryParams = {} as TQueryParams,
  headers,
  transformRequest
}: {
  url: string
  method: Method
  request?: TRequest
  queryParams?: TQueryParams
  headers: Record<string, string>
  transformRequest?: (data: TRequest) => unknown
}): Promise<TResponse> {
  try {
    const config = {
      method,
      url,
      params: queryParams,
      headers,
      data:
        method !== 'GET'
          ? transformRequest
            ? transformRequest(request as TRequest)
            : request
          : undefined
    }

    const response = await axios(config)
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError
      if (axiosError.response) {
        throw new CoSignerApiError(
          axiosError.response.status,
          JSON.stringify(axiosError.response.data)
        )
      } else {
        throw new CoSignerApiError(500, 'Network error')
      }
    }
    throw error
  }
}

// Class to interact with the WalletConnect CoSigner API
export class CosignerService {
  private baseUrl: string
  private projectId: string

  constructor(projectId: string) {
    this.baseUrl = COSIGNER_BASE_URL
    this.projectId = projectId
  }

  async addPermission(address: string, data: AddPermissionRequest): Promise<AddPermissionResponse> {
    const url = `${this.baseUrl}/${encodeURIComponent(address)}`

    return await sendCoSignerRequest<
      AddPermissionRequest,
      AddPermissionResponse,
      { projectId: string }
    >({
      url,
      method: 'POST',
      request: data,
      queryParams: { projectId: this.projectId },
      headers: { 'Content-Type': 'application/json' }
    })
  }

  async activatePermissions(
    address: string,
    updateData: ActivatePermissionsRequest
  ): Promise<void> {
    const url = `${this.baseUrl}/${encodeURIComponent(address)}/activate`
    await sendCoSignerRequest<ActivatePermissionsRequest, never, { projectId: string }>({
      url,
      method: 'POST',
      request: updateData,
      queryParams: { projectId: this.projectId },
      headers: { 'Content-Type': 'application/json' }
    })
  }

  async coSignUserOperation(address: string, coSignData: CoSignRequest): Promise<CoSignResponse> {
    const url = `${this.baseUrl}/${encodeURIComponent(address)}/sign`

    return await sendCoSignerRequest<CoSignRequest, CoSignResponse, { projectId: string }>({
      url,
      method: 'POST',
      request: coSignData,
      queryParams: { projectId: this.projectId },
      headers: { 'Content-Type': 'application/json' },
      transformRequest: (value: CoSignRequest) => JSON.stringify(value, bigIntReplacer)
    })
  }

  async getPermissionsContext(
    address: string,
    getPermissionsContextRequest: GetPermissionsContextRequest
  ): Promise<GetPermissionsContextResponse> {
    // need to change the method to use POST method and pass pci in the body with url as /{address}/getContext
    const url = `${this.baseUrl}/${encodeURIComponent(address)}/getcontext`
    return await sendCoSignerRequest<
      never,
      GetPermissionsContextResponse,
      { projectId: string; pci: string }
    >({
      url,
      method: 'GET',
      // request: getPermissionsContextRequest,
      queryParams: { projectId: this.projectId, pci: getPermissionsContextRequest.pci },
      headers: { 'Content-Type': 'application/json' }
    })
  }

  async getPermissions(address: string): Promise<GetPermissionsResponse> {
    const url = `${this.baseUrl}/${encodeURIComponent(address)}`
    return await sendCoSignerRequest<never, GetPermissionsResponse, { projectId: string }>({
      url,
      method: 'GET',
      queryParams: { projectId: this.projectId },
      headers: { 'Content-Type': 'application/json' }
    })
  }

  async revokePermission(address: string, revokeData: RevokePermissionRequest): Promise<void> {
    const url = `${this.baseUrl}/${encodeURIComponent(address)}/revoke`
    await sendCoSignerRequest<RevokePermissionRequest, never, { projectId: string }>({
      url,
      method: 'POST',
      request: revokeData,
      queryParams: { projectId: this.projectId },
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
