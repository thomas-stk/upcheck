import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // base './' makes asset paths relative, required for Electron's file:// protocol.
  // Without this, Vite outputs /assets/index.js (absolute) which 404s in Electron.
  base: './',
})
