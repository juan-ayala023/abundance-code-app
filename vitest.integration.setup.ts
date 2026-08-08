import { existsSync } from 'node:fs'
import process from 'node:process'

// Node 22+ carga archivos .env de forma nativa; no hace falta dotenv.
if (existsSync('.env.local')) {
  process.loadEnvFile('.env.local')
}

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]

const missing = required.filter((name) => !process.env[name])

if (missing.length > 0) {
  throw new Error(
    `Faltan variables para los tests de integración: ${missing.join(', ')}. ` +
      'Rellena .env.local.',
  )
}
