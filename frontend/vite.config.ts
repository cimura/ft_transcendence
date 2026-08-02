import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    watch: {
      usePolling: true,
    },
    hmr: {
      protocol: 'wss',
      clientPort: 8443,
    },
  },
})
