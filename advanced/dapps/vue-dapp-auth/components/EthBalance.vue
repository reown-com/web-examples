<template>
  <loading-spinner v-if="loading" class="tw-h-8" />
  <div v-else class="tw-h-8 tw-leading-xs tw-inline-flex tw-items-center tw-gap-2">
    <img src="/img/eth.png" alt="ETH" class="tw-size-8">
    {{ value }} ETH
  </div>
</template>

<script setup lang="ts">
interface Props {
  value?: number | null
  loading?: boolean
}
withDefaults(defineProps<Props>(), {
  value: 0,
})
</script>
