<template>
  <div class="tw-p-2.5 tw-rounded tw-inline-flex tw-items-center tw-gap-2 tw-bg-dim-1">
    <img src="/img/wc-bg.png" alt="WalletConnect logo" class="tw-size-8">
    <span class="tw-px-0.5">
      v{{ authClientVersion }}
    </span>
  </div>
</template>

<script setup lang="ts">
const { authClientVersion } = useRuntimeConfig()
</script>
