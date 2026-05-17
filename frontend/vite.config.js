import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: [
      'unimposed-unescutcheoned-ryker.ngrok-free.dev',
      '.ngrok-free.dev', // Allow all ngrok-free.dev subdomains
      '.trycloudflare.com', // Allow all Cloudflare tunnel subdomains
    ],
    proxy: {
      '/login': 'http://localhost:3000',
      '/form': 'http://localhost:3000',
      '/admin/': 'http://localhost:3000',
    }
  }
})
