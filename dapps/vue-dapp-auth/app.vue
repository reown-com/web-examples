<template>
  <main class="tw-py-8 tw-container tw-h-screen tw-flex tw-flex-col">
    <div class="tw-flex tw-justify-center">
      <nuxt-link :to="{ name: 'index' }" class="tw-pl-2.5 tw-text-lg tw-inline-flex tw-items-center tw-gap-3">
        <span class="tw-leading-xs">
          Example Vue App
        </span>
        <wc-label />
      </nuxt-link>
    </div>

    <div class="tw-section tw-flex-1">
      <nuxt-page />
    </div>

    <footer class="tw-flex tw-justify-end">
      <switch-theme />
    </footer>
  </main>
</template>

<script setup lang="ts">
const { authClientVersion } = useRuntimeConfig()

// eslint-disable-next-line no-console
console.log(`AuthClient@${authClientVersion}`)
</script>
