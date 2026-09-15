import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Proxy para datos GTFS-RT (S3)
      '/gtfs-proxy': {
        target: 'https://sonda-gtfs-prd.s3.amazonaws.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gtfs-proxy/, ''),
        secure: false
      },
      // SOLO para desarrollo local sin Vercel CLI:
      // Redirige /api/ al servidor de Vercel Dev (puerto 3000).
      // Si usas `vercel dev` en lugar de `vite`, este proxy no es necesario.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
