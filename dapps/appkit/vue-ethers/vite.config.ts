import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'


// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      buffer: 'buffer/'
    }
  },
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag:any) => ['appkit-button', 'appkit-network-button'].includes(tag),
        },
      },
    }),
  ]
})
