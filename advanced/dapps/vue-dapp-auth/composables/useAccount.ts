import type { MaybeRef } from '@vueuse/shared'
import { providers } from 'ethers'

export const useAccount = (address: MaybeRef<string>) => {
  const balance = ref<number | null>(null)
  const avatar = ref<string | null>(null)
  const isLoading = ref(false)

  const updateAccountInfo = async () => {
    const addressValue = unref(address)
    if (addressValue) {
      isLoading.value = true

      const provider = providers.getDefaultProvider()
      balance.value = (await provider.getBalance(addressValue)).toNumber()
      avatar.value = await provider.getAvatar(addressValue)

      isLoading.value = false
    } else {
      avatar.value = null
      balance.value = null
    }
  }

  // Register watcher for a ref
  // or just call the effect once for regular value
  if (isRef(address)) {
    watchEffect(updateAccountInfo)
  } else {
    updateAccountInfo()
  }

  return { balance, avatar, isLoading }
}
