/**
 * EIP7715Method
 */
export const EIP7715_METHOD = {
  WALLET_GRANT_PERMISSIONS: 'wallet_grantPermissions'
}

export type GrantPermissionsRequestParams = {
  signer?: {
    type: {
      name: string
      uuid?: string
    }
    data: any
  }

  permissions: {
    type: {
      name: string
      uuid?: string
    }
    data: any
    required: boolean
  }[]

  expiry: number
}

export type GrantPermissionsResponse = {
  grantedPermissions: {
    type: {
      name: string
      uuid?: string
    }
    data: any
  }[]

  expiry: number

  signerData: {
    userOpBuilder?: `0x${string}`
    submitToAddress?: `0x${string}`
  }

  factory?: `0x${string}`
  factoryData?: string

  permissionsContext: string
}
