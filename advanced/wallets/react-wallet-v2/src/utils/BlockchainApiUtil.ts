// -- Types ----------------------------------------------------------------------

interface RequestArguments {
  path: string
  headers?: HeadersInit
  params?: Record<string, string | undefined>
}
const BLOCKCHAIN_API_URL_BASE = 'https://rpc.walletconnect.org'

// -- Utility --------------------------------------------------------------------
export const BlockchainApiUtil = {
  async get<T>({ headers, ...args }: RequestArguments) {
    const url = this.createUrl(args)
    const response = await fetch(url, {
      method: 'GET',
      headers
    })

    return response.json() as T
  },

  async post<T>({ headers, ...args }: RequestArguments, body: any) {
    const url = this.createUrl(args)
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })

    return response.json() as T
  },

  async getBlob({ headers, ...args }: RequestArguments) {
    const url = this.createUrl(args)
    const response = await fetch(url, { method: 'GET', headers })

    if (response.status !== 200) {
      return undefined
    }

    return response.blob()
  },

  createUrl({ path, params, chainId }: RequestArguments & { chainId?: string }) {
    const projectId = new URLSearchParams(location.search).get('projectId')
    const baseUrl = `${BLOCKCHAIN_API_URL_BASE}/v1`
    const requestParams = {
      chainId: chainId,
      projectId,
      ...params
    }
    const url = new URL(path, baseUrl)

    for (const [key, value] of Object.entries(requestParams)) {
      if (value) {
        url.searchParams.append(key, value)
      }
    }

    return url
  }
}
