import { SafeUserOpBuilder } from '@/lib/smart-accounts/builders/SafeUserOpBuilder'
import { UserOpBuilder } from '@/lib/smart-accounts/builders/UserOpBuilder'
import {
  Address,
  Chain,
  createPublicClient,
  getAddress,
  http,
  PublicClient,
  size,
  slice
} from 'viem'
import { publicClientUrl } from './SmartAccountUtil'
import {
  SAFE_4337_MODULE_ADDRESSES,
  SAFE_FALLBACK_HANDLER_STORAGE_SLOT
} from '@/consts/smartAccounts'

type GetUserOpBuilderParams = {
  account: Address
  chain: Chain
  publicClient?: PublicClient
}

export async function getUserOpBuilder(params: GetUserOpBuilderParams): Promise<UserOpBuilder> {
  let publicClient = params.publicClient
  if (!publicClient) {
    publicClient = createPublicClient({
      transport: http(publicClientUrl({ chain: params.chain }))
    })
  }
  if (await isSafeAccount(publicClient, params.account)) {
    return new SafeUserOpBuilder(params.account, params.chain.id)
  }

  throw new Error('Unsupported implementation type')
}

async function isSafeAccount(publicClient: PublicClient, address: Address): Promise<Boolean> {
  try {
    const storageValue = await publicClient.getStorageAt({
      address,
      slot: SAFE_FALLBACK_HANDLER_STORAGE_SLOT
    })
    if (!storageValue) {
      return false
    }
    const safe4337ModuleAddress = getAddress(slice(storageValue, size(storageValue) - 20))
    return SAFE_4337_MODULE_ADDRESSES.includes(safe4337ModuleAddress)
  } catch (error) {
    console.log('Unable to check if account is Safe', error)
    return false
  }
}
