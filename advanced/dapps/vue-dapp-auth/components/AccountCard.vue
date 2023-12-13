<template>
  <div class="tw-card tw-w-full tw-max-w-xs tw-space-y-6">
    <div class="tw-space-y-6">
      <div class="tw-flex tw-justify-between tw-items-start tw-gap-2">
        <avatar-image class="tw--ml-2" :src="avatar" :loading="isLoading" />
        <connected-badge />
      </div>
      <h3>{{ formattedAddress }}</h3>
    </div>

    <hr>

    <div class="tw-text-dim-1 tw-text-xl tw-flex tw-items-center tw-gap-4">
      <p class="tw-flex-1">
        Balance
      </p>
      <eth-balance :value="balance" :loading="isLoading" />
    </div>

    <button class="tw-button-secondary tw-text-lg tw-w-full" @click="resetConnection()">
      Sign Out
    </button>
  </div>
</template>

<script setup lang="ts">
import truncate from 'smart-truncate'
import { useConnectionStore } from '../stores'

const props = defineProps<{
  address: string
}>()

const { address } = toRefs(props)
const formattedAddress = computed(() => truncate(address.value, 12, { position: 7 }))
const { balance, avatar, isLoading } = useAccount(address)

const { reset: resetConnection } = useConnectionStore()
</script>
