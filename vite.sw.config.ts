import { defineConfig } from 'vite'

// The service worker, built after the app into dist/sw.js: one classic script at the app's
// scope (/swim-meet/), since not every browser runs module service workers.
export default defineConfig({
  base: '/swim-meet/',
  publicDir: false,
  build: {
    emptyOutDir: false,
    copyPublicDir: false,
    rollupOptions: {
      input: 'src/sw/sw.ts',
      output: { format: 'iife', entryFileNames: 'sw.js' },
    },
  },
})
