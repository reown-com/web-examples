import { version as authClientVersion } from '@walletconnect/auth-client/package.json'

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/color-mode',
    'nuxt-icon',
    '@vueuse/nuxt',
    '@pinia/nuxt',
  ],

  tailwindcss: {
    cssPath: '~/assets/scss/tailwind.scss',
  },

  runtimeConfig: {
    public: {
      /**
       * Avoiding framework-specific prefixes for env vars
       * see https://v3.nuxtjs.org/guide/features/runtime-config/#environment-variables
       */
      WALLETCONNECT_PROJECT_ID: process.env.WALLETCONNECT_PROJECT_ID ?? '',
      WALLETCONNECT_RELAY_URL: process.env.WALLETCONNECT_RELAY_URL ?? 'wss://relay.walletconnect.com',

      authClientVersion,
    },
  },
})
