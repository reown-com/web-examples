<template>
  <div class="tw-border tw-border-muted tw-bg-placeholder tw-circle-24 tw-flex tw-items-center tw-justify-center">
    <loading-spinner v-if="loading" class="tw-text-2xl" />
    <img v-else-if="src" :src="src" :alt="alt">
  </div>
</template>

<script setup lang="ts">
interface Props {
  src?: string | null
  loading?: boolean
  alt?: string
}

withDefaults(defineProps<Props>(), {
  alt: 'Avatar',
})
</script>
