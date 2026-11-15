import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Hosted at azthrun.github.io/swim-meet, so every asset URL starts with /swim-meet/.
export default defineConfig({
  base: '/swim-meet/',
  plugins: [react(), tailwindcss()],
  // In development the service worker is served from src/sw/ but must control the whole app.
  server: { headers: { 'Service-Worker-Allowed': '/swim-meet/' } },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
