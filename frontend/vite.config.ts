import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const FILE_WATCH_POLL_INTERVAL_MS = 1_000
// バインドマウント経由で inotify が届かない環境でのみポーリングを使う(常時有効だと CPU を消費し続けるため)
const usePolling = process.env.VITE_USE_POLLING === 'true'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling,
      interval: FILE_WATCH_POLL_INTERVAL_MS,
    },
    hmr: {
      protocol: 'wss',
      clientPort: 8443,
    },
  },
})
