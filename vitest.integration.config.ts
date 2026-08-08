import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const rootDir = dirname(fileURLToPath(import.meta.url))

/**
 * Tests de integración: hablan con el proyecto Supabase real.
 * Separados de los unitarios porque necesitan red y credenciales.
 */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      'server-only': resolve(rootDir, 'node_modules/server-only/empty.js'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    setupFiles: ['./vitest.integration.setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Comparten usuarios y filas en una base real: no paralelizar.
    fileParallelism: false,
  },
})
