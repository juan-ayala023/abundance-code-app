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
    env: { ...process.env } as Record<string, string>,
  },
})
