import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Hosted at azthrun.github.io/swim-meet, so every asset URL starts with /swim-meet/.
export default defineConfig({
  base: '/swim-meet/',
  plugins: [react(), tailwindcss()],
  test: {
    include: ['src/**/*.test.ts'],
  },
})
