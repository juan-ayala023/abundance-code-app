import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const rootDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // `server-only` lanza un error salvo bajo la condición "react-server",
      // que vitest no aplica. Se apunta a su propio módulo vacío (el campo
      // `exports` del paquete no lo expone, de ahí la ruta absoluta) para
      // poder testear módulos de servidor sin desactivar la protección real:
      // en el build de Next la condición sí aplica y el guard sigue vigente.
      'server-only': resolve(rootDir, 'node_modules/server-only/empty.js'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Los de integración necesitan red y credenciales: van aparte,
    // con `npm run test:integration`.
    exclude: [
      '**/node_modules/**',
      'src/**/*.integration.test.ts',
      'src/**/*.routes.test.ts',
    ],
  },
})
