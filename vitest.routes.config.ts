import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const rootDir = dirname(fileURLToPath(import.meta.url))

/**
 * Pruebas de protección de rutas: levantan el build de producción y comprueban
 * qué responde el servidor de verdad, middleware incluido.
 *
 * Existen porque un middleware mal ubicado compila, despliega y no protege
 * nada, sin un solo error visible.
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
    include: ['src/**/*.routes.test.ts'],
    globalSetup: ['./vitest.routes.setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 90_000,
    fileParallelism: false,
  },
})
