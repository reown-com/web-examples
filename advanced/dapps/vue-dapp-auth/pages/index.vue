<template>
  <div class="tw-h-full tw-flex tw-items-center tw-justify-center">
    <client-only>
      <account-card v-if="address" :address="address" />
      <qr-view v-else-if="connectUri" :uri="connectUri" />
      <connect-view v-else />
    </client-only>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useConnectionStore } from '../stores'

const connectionStore = useConnectionStore()
const { connectUri, address } = storeToRefs(connectionStore)

// Init auth client
onMounted(connectionStore.init)
</script>
