import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // listen on your LAN IP too
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000', // change 3000 to your Express port
    },
  },
})