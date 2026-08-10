import { existsSync } from 'node:fs'
import process from 'node:process'

import { defineConfig, devices } from '@playwright/test'

// Estas pruebas hablan con el proyecto Supabase real: necesitan credenciales.
if (existsSync('.env.local')) process.loadEnvFile('.env.local')

const PORT = 3200
const baseURL = `http://127.0.0.1:${PORT}`

/**
 * Pruebas de las páginas que están detrás del login.
 *
 * Usan el build de verificación (`.next-verify`) y un puerto propio para no
 * pisar ni el servidor de desarrollo ni las pruebas de rutas.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'html' : 'list',
  timeout: 60_000,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `cross-env NEXT_DIST_DIR=.next-verify npx next start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      /*
       * Sin clave de IA a propósito.
       *
       * `/generando` dispara la generación de la lectura al montarse. Con clave,
       * cada `npm run verify` haría una llamada real de más de un minuto y se
       * pagaría. Dejándola vacía —que el esquema de entorno trata como ausente—
       * las pruebas se quedan con el camino degradado, que es justo el que
       * conviene tener cubierto: que falte la clave no debe romper la pantalla.
       *
       * A cambio, el camino feliz de la generación no se prueba aquí. Se
       * verificó a mano contra la API real y su lógica vive en funciones puras
       * probadas aparte.
       */
      OPENAI_API_KEY: '',
      ANTHROPIC_API_KEY: '',
      /*
       * Sin integración con la landing, también a propósito.
       *
       * Estas pruebas siembran sus compras directamente en `entitlements`, con
       * correos `e2e-…@example.com` que no existen en el backend de la landing.
       * Con la integración activa, la primera revalidación preguntaría por ellos,
       * recibiría «no tiene acceso» —correctamente— y **echaría a todos los
       * usuarios de prueba**, tumbando la suite entera por un motivo que no tiene
       * nada que ver con lo que cada prueba comprueba.
       *
       * Dejándolas vacías, la app se queda en el camino degradado: sirve el
       * acceso desde la caché local. Que es, además, justo el comportamiento que
       * el contrato exige cuando su backend no está disponible, así que esta
       * suite lo ejercita en cada ejecución.
       */
      LANDING_API_URL: '',
      APP_SHARED_SECRET: '',
    } as Record<string, string>,
  },
})
