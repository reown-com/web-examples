import { acceptHMRUpdate, defineStore } from 'pinia'
import AuthClient, { generateNonce } from '@walletconnect/auth-client'

export const useConnectionStore = defineStore('connection', () => {
  const address = useLocalStorage<string | null>('address', null)
  const connectUri = ref<string | null>(null)

  const client = ref<AuthClient | null>(null)
  const initialized = computed(() => !!client.value)

  // reactive auth error
  const error = ref<string | null>(null)

  const setError = (e: unknown) => {
    error.value = e?.toString() ?? null
    console.error(e)
  }

  // Init client and listen to auth events
  // as soon as the owner component is mounted
  const config = useRuntimeConfig()
  onMounted(() => {
    AuthClient.init({
      relayUrl: config.WALLETCONNECT_RELAY_URL,
      projectId: config.WALLETCONNECT_PROJECT_ID,
      metadata: {
        name: 'vue-dapp-auth',
        description: 'Vue 3 Example Dapp for Auth',
        url: window.location.host,
        icons: [`${window.location.origin}/img/wc-bg.png`],
      },
    })
    .then(authClient => {
      client.value = authClient
    })
    .catch(setError)
  })

  watch(client, () => {
    if (!client.value) return
    client.value.on('auth_response', ({ params }) => {
      if ('code' in params) {
        return setError(params.message)
      }
      if ('error' in params) {
        return setError(params.error)
      }
      address.value = params.result.p.iss.split(':')[4]
    })
  })

  // Reset in case if the address is removed from the localStorage side
  watch(address, () => {
    if (!address.value) {
      reset()
    }
  })

  const reset = () => {
    address.value = null
    connectUri.value = null
    error.value = null
  }

  return {
    address,
    connectUri,
    initialized,
    error,

    reset,

    async requestConnection() {
      if (!client.value) return
      const { uri } = await client.value.request({
        aud: window.location.href,
        domain: window.location.hostname.split('.').slice(-2).join('.'),
        chainId: 'eip155:1',
        type: 'eip4361',
        nonce: generateNonce(),
        statement: 'Sign in with wallet.',
      })
      connectUri.value = uri
    }
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useConnectionStore, import.meta.hot))
}
