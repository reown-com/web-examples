import { proxy, subscribe } from 'valtio'
import { BlockchainApiUtil } from '@/utils/BlockchainApiUtil'

// -- Types --------------------------------------------- //
type Request = {
  endpoint: string
  body: any
  projectId: string
}

export interface Balance {
  name: string
  symbol: string
  chainId: string
  address?: string
  value?: number
  price: number
  quantity: BalanceQuantity
  iconUrl: string
}

type BalanceQuantity = {
  decimals: string
  numeric: string
}

type AddressBalanceData = {
  balances: Balance[]
  lastFetchTimestamp: number
}
type WalletGetAssetsCtrlState = {
  addressBalances: Record<string, AddressBalanceData>
}

type ApiHeaders = {
  'x-sdk-type': string
  'x-sdk-version': string
  'x-project-id'?: string
}

const BALANCES_STORAGE_KEY = 'wallet_balances'
const BALANCES_EXPIRY_TIME = 120000

const initialState = (): WalletGetAssetsCtrlState => {
  if (typeof window === 'undefined') {
    return {
      addressBalances: {}
    }
  }
  const storedData = localStorage.getItem(BALANCES_STORAGE_KEY)
  if (storedData) {
    try {
      const parsedData = JSON.parse(storedData)
      return {
        addressBalances: parsedData.addressBalances || {}
      }
    } catch (error) {
      console.error('Error parsing stored balances:', error)
    }
  }
  return {
    addressBalances: {}
  }
}

const state = proxy<WalletGetAssetsCtrlState>(initialState())

subscribe(state, () => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(
      BALANCES_STORAGE_KEY,
      JSON.stringify({
        addressBalances: state.addressBalances
      })
    )
  }
})

// -- Controller ---------------------------------------- //
export const WalletGetAssetsCtrl = {
  state,

  getApiHeaders(projectId?: string) {
    const headers: ApiHeaders = {
      'x-sdk-type': 'w3m',
      'x-sdk-version': 'react-wallet-v2'
    }

    if (projectId) {
      headers['x-project-id'] = projectId
    }
    return headers
  },

  isBalanceExpired(address: string): boolean {
    const addressData = state.addressBalances[address]
    if (!addressData) return true
    const currentTime = Date.now()
    return currentTime - addressData.lastFetchTimestamp > BALANCES_EXPIRY_TIME
  },

  async getBalance(address: string, chainId?: string): Promise<{ balances: Balance[] }> {
    const needRefetch = this.isBalanceExpired(address)
    if (!needRefetch) {
      return { balances: state.addressBalances[address].balances }
    }

    const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || ''
    const headers = this.getApiHeaders()

    try {
      const balances = await BlockchainApiUtil.get<{ balances: Balance[] }>({
        path: `/v1/account/${address}/balance`,
        headers,
        params: {
          currency: 'usd',
          projectId,
          chainId
        }
      })

      state.addressBalances[address] = {
        balances: balances.balances,
        lastFetchTimestamp: Date.now()
      }

      return balances
    } catch (error) {
      console.error('Failed to fetch balances:', error)

      return {
        balances: state.addressBalances[address]?.balances || []
      }
    }
  },

  clearBalances(address?: string) {
    if (address) {
      delete state.addressBalances[address]
    } else {
      state.addressBalances = {}
    }
    localStorage.setItem(
      BALANCES_STORAGE_KEY,
      JSON.stringify({ addressBalances: state.addressBalances })
    )
  },

  setBalances(address: string, balances: Balance[]) {
    state.addressBalances[address] = {
      balances,
      lastFetchTimestamp: Date.now()
    }
  }
}
