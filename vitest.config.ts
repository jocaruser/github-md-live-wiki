import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const isCi = process.env.CI === 'true'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/Unit/setup.ts'],
    globals: true,
    include: ['tests/Unit/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules', 'dist'],
    ...(isCi ? { maxWorkers: 2 } : {}),
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // Wires the DOM entry point only; everything it composes is covered.
        'src/main.tsx',
        // Erasable type declarations with zero executable code.
        'src/types.d.ts',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
})
