<template>
  <div class="tw-w-full tw-relative tw-flex tw-flex-col tw-items-center">
    <img
      src="/img/auth.png"
      alt="WalletConnect Auth Client logo"
      class="tw-absolute tw--top-14 tw-size-20 tw-blur-md"
    >
    <img
      src="/img/auth.png"
      alt="WalletConnect Auth Client logo"
      class="tw-absolute tw--top-14 tw-size-20 tw-blur-px"
    >

    <div class="tw-card tw-text-center tw-w-full tw-max-w-xs">
      <h2 class="tw-mt-2.5">
        Sign in
      </h2>

      <button
        class="tw-button-primary tw-text-xl tw-justify-between tw-w-full sm:tw-min-w-[11em]"
        :disabled="!initialized || isLoading"
        @click="requestConnection()"
      >
        <img src="/img/wc.png" alt="WalletConnect logo" class="tw-h-4 tw-w-auto tw-mx-auto">
        <span class="tw-flex-1 tw-text-center tw-hidden sm:tw-inline">
          <template v-if="initialized">
            WalletConnect
          </template>
          <template v-else>
            Initializing...
          </template>
        </span>
      </button>

      <p v-if="error" class="tw-text-sm tw-text-state-error">
        {{ error }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useConnectionStore } from '../stores'

const connectionStore = useConnectionStore()
const { error, initialized } = storeToRefs(connectionStore)

const isLoading = ref(false)

const requestConnection = async () => {
  isLoading.value = true
  await connectionStore.requestConnection()
  isLoading.value = false
}
</script>
