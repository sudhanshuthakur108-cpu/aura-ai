import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // The 3D companion chunk (three.js + React Three Fiber, ~250 kB gzipped) is
    // lazy-loaded and never blocks the app shell, so it is allowed to exceed
    // Vite's default 500 kB warning threshold.
    chunkSizeWarningLimit: 1000,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
