import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const rootDir = dirname(fileURLToPath(import.meta.url))

/**
 * Muestras: scripts que llaman al modelo de verdad para producir ejemplos
 * que alguien va a leer (`scripts/*.muestra.ts`). No son tests —no afirman
 * nada— y cuestan dinero, así que van con su propia configuración y nunca
 * dentro de `npm test` ni de `npm run verify`.
 *
 *   npx vitest run --config vitest.muestras.config.ts
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
    include: ['scripts/**/*.muestra.ts'],
    testTimeout: 600_000,
    fileParallelism: false,
  },
})
