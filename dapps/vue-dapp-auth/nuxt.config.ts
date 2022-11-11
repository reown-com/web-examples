import { version as authClientVersion } from '@walletconnect/auth-client/package.json'

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  vite: {
    devBundler: 'legacy',
  },
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
       * Override in .env
       * NOTE:
       * - Could use Nuxt's native auto-injected NUXT_* env vars, but framework-specific prefixes are not cool
       * https://v3.nuxtjs.org/guide/features/runtime-config/#environment-variables
       * - PLEASE, use `.env` file, not `.env.local` or whatever
       */
      WALLETCONNECT_PROJECT_ID: process.env.WALLETCONNECT_PROJECT_ID ?? '',
      WALLETCONNECT_RELAY_URL: process.env.WALLETCONNECT_RELAY_URL ?? 'wss://relay.walletconnect.com',

      authClientVersion,
    },
  },
})
