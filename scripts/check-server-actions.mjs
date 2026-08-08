#!/usr/bin/env node
/**
 * Comprueba que los módulos con 'use server' solo exportan funciones asíncronas.
 *
 * Es una regla de Next que TypeScript no valida: exportar una constante desde
 * un módulo de acciones de servidor compila sin quejarse, pasa el build, y en
 * el cliente esa constante llega como `undefined`. El fallo aparece en el
 * primer render de la página, que además suele estar detrás de login y por
 * tanto fuera del alcance de las pruebas de rutas.
 *
 * Los `export type` y `export interface` sí valen: desaparecen al compilar.
 */

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'

const RAIZ = join(process.cwd(), 'src')

async function recogerFuentes(dir) {
  const encontrados = []

  for (const entrada of await readdir(dir, { withFileTypes: true })) {
    const completo = join(dir, entrada.name)

    if (entrada.isDirectory()) {
      encontrados.push(...(await recogerFuentes(completo)))
    } else if (/\.tsx?$/.test(entrada.name)) {
      encontrados.push(completo)
    }
  }

  return encontrados
}

/** Exportaciones de valor que no son funciones asíncronas. */
const EXPORT_PROHIBIDO =
  /^\s*export\s+(?!type\b|interface\b|default\s+async\s+function\b|async\s+function\b)(const|let|var|class|function)\s+([A-Za-z0-9_$]+)/gm

async function main() {
  const infracciones = []

  for (const archivo of await recogerFuentes(RAIZ)) {
    const contenido = await readFile(archivo, 'utf8')

    // La directiva debe ser lo primero del archivo.
    const primeraLinea = contenido.trimStart().split('\n')[0]?.trim()
    if (primeraLinea !== "'use server'" && primeraLinea !== '"use server"') continue

    for (const coincidencia of contenido.matchAll(EXPORT_PROHIBIDO)) {
      const linea = contenido.slice(0, coincidencia.index).split('\n').length
      infracciones.push(
        `${archivo}:${linea}  exporta "${coincidencia[2]}" (${coincidencia[1]}), ` +
          'que no es una función asíncrona',
      )
    }
  }

  if (infracciones.length > 0) {
    console.error(
      "FALLO: un módulo 'use server' solo puede exportar funciones asíncronas.\n" +
        'Mueve estas exportaciones a un módulo normal:\n',
    )
    for (const infraccion of infracciones) console.error(`  - ${infraccion}`)
    process.exit(1)
  }

  console.log("OK: los módulos 'use server' solo exportan funciones asíncronas.")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
