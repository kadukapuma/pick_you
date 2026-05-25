import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['192.168.1.6'],
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: ['192.168.1.6'],
  },
})
