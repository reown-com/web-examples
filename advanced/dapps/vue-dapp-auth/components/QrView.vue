<template>
  <div class="tw-card tw-text-center tw-space-y-8 tw-w-full tw-max-w-sm">
    <qr-code
      background="transparent"
      :foreground="foreground"
      class="qr-code tw-py-4"
      :value="uri"
      :size="400"
    />

    <hr class="tw-mx-12">

    <div class="tw-space-y-4 tw-flex tw-flex-col tw-items-center">
      <div class="tw-text-center">
        <h3 class="tw-text-dim-1">
          Scan with your phone
        </h3>
        <p class="tw-text-dim-2">
          Open your camera app or mobile wallet and scan the code to connect
        </p>
      </div>

      <button class="tw-button-secondary tw-text-lg tw-w-full sm:tw-min-w-[7em]" @click="copyLink()">
        <icon name="copy" />
        {{ message }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import QrCode from 'qrcode.vue'

const props = defineProps<{
  uri: string
}>()

const colorMode = useColorMode()
const foreground = computed(
  () => colorMode.value === Theme.dark
    ? '#fff'
    : '#000',
)

const message = refAutoReset('Copy to clipboard', 1000)

const copyLink = async () => {
  await navigator.clipboard.writeText(props.uri)
  message.value = 'Copied!'
}
</script>

<style scoped>
  .qr-code {
    @apply tw-mx-auto;
    width: 100% !important;
    height: auto !important;
    max-width: theme('maxWidth.xs');
  }
</style>
