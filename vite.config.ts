import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { aiApiPlugin } from './src/ai/vitePlugin.ts'
import { metaApiPlugin } from './src/meta/vitePlugin.ts'

export default defineConfig({
  plugins: [react(), metaApiPlugin(), aiApiPlugin()],
  server: {
    host: '127.0.0.1',
    proxy: {
      '/liveclientdata': {
        target: 'https://127.0.0.1:2999',
        changeOrigin: true,
        // Riot's local game client uses a self-signed certificate.
        secure: false,
      },
    },
  },
  preview: {
    host: '127.0.0.1',
  },
})
