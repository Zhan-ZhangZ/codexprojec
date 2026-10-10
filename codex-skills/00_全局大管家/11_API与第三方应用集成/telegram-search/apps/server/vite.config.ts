import { resolve } from 'pathe'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      '@tg-search/common': resolve(import.meta.dirname, '../../packages/common/src'),
      '@tg-search/core': resolve(import.meta.dirname, '../../packages/core/src'),
      '@tg-search/bot': resolve(import.meta.dirname, '../../packages/bot/src'),
    },
  },
})
