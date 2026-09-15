import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/gtfs-proxy': {
        target: 'https://sonda-gtfs-prd.s3.amazonaws.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gtfs-proxy/, ''),
        secure: false
      },
      '/auth-proxy': {
        target: 'https://metrobus-gtfs.sinopticoplus.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/auth-proxy/, ''),
        secure: false
      }
    }
  }
})
