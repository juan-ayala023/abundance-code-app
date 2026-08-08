#!/usr/bin/env node
/**
 * Comprueba que ningún secreto de servidor acabó en el bundle del cliente.
 *
 * Verifica dos cosas sobre `.next/static`:
 *   1. Que no aparezca el NOMBRE de ninguna variable secreta.
 *   2. Que no aparezca el VALOR de ninguna variable secreta que esté definida
 *      en el entorno actual (esto es lo que realmente importa).
 *
 * Se ejecuta con `npm run check:secrets`, después de `npm run build`.
 */

import { readdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

// Cargar el entorno local es lo que permite buscar los VALORES reales de los
// secretos en el bundle, no solo sus nombres. Sin esto la comprobación es
// mucho más débil de lo que parece.
if (existsSync('.env.local')) {
  process.loadEnvFile('.env.local')
}

// El build de verificación usa su propia carpeta para no pisar la de `next dev`.
const DIST_DIR = process.env.NEXT_DIST_DIR || '.next'
const STATIC_DIR = join(process.cwd(), DIST_DIR, 'static')

/** Variables que jamás pueden aparecer en código de cliente. */
const FORBIDDEN_VARS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'GEOCODING_API_KEY',
  'ACCESS_SHARED_SECRET',
]

/** Un valor demasiado corto daría falsos positivos al buscarlo como substring. */
const MIN_VALUE_LENGTH = 12

async function collectJsFiles(dir) {
  const found = []
  const entries = await readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      found.push(...(await collectJsFiles(full)))
    } else if (entry.name.endsWith('.js')) {
      found.push(full)
    }
  }

  return found
}

async function main() {
  if (!existsSync(STATIC_DIR)) {
    console.error(`No existe ${STATIC_DIR}. Ejecuta "npm run build:verify" primero.`)
    process.exit(1)
  }

  const files = await collectJsFiles(STATIC_DIR)
  if (files.length === 0) {
    console.error(`No se encontró ningún .js en ${STATIC_DIR}. Build incompleto.`)
    process.exit(1)
  }

  const secretValues = FORBIDDEN_VARS.map((name) => [name, process.env[name]]).filter(
    ([, value]) => typeof value === 'string' && value.length >= MIN_VALUE_LENGTH,
  )

  const violations = []

  for (const file of files) {
    const content = await readFile(file, 'utf8')

    for (const name of FORBIDDEN_VARS) {
      if (content.includes(name)) {
        violations.push(`${file}: contiene el nombre "${name}"`)
      }
    }

    for (const [name, value] of secretValues) {
      if (content.includes(value)) {
        violations.push(`${file}: contiene el VALOR de ${name}`)
      }
    }
  }

  if (violations.length > 0) {
    console.error('FALLO: secretos de servidor filtrados al bundle del cliente:\n')
    for (const violation of violations) console.error(`  - ${violation}`)
    process.exit(1)
  }

  const checkedValues = secretValues.length
  console.log(
    `OK: ${files.length} archivos de cliente revisados. ` +
      `Sin nombres de secretos (${FORBIDDEN_VARS.length} vigilados) ` +
      `ni valores filtrados (${checkedValues} con valor presente en el entorno).`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
