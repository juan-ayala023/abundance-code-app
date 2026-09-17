import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

import { it } from 'vitest'

import { createLocalChartProvider } from '@/lib/astrology/local'
import { transitosDeHoy } from '@/lib/astrology/cielo'
import { generarLecturaBase } from '@/lib/lectura/generar'
import { generarActivacionDiaria } from '@/lib/lectura/generar-activacion'
import { generarRespuestaGuia } from '@/lib/lectura/generar-guia'
import { nombreDePila } from '@/lib/lectura/voz'
import { resolveBirthInstant } from '@/lib/time/birth-instant'

/**
 * Genera los ejemplos que pide la revisión de septiembre de 2026 (§11): una
 * lectura personal, una activación diaria, una respuesta de guía, y otra
 * respuesta con muy poco contexto y un nombre comercial en el perfil, para
 * demostrar que el modelo no inventa circunstancias.
 *
 * Se ejecuta con vitest y no con `tsx` por la misma razón que los tests: los
 * generadores llevan `server-only`, y la configuración de vitest lo sustituye
 * por un módulo vacío. Es una muestra, no un test —no afirma nada—, y va
 * fuera de `src/` para que `npm test` no lo ejecute.
 *
 *   npx vitest run --config vitest.muestras.config.ts
 *
 * Con `EJEMPLOS_REUSAR=1` reutiliza la lectura y la activación de la última
 * ejecución (guardadas en el directorio temporal) y solo vuelve a pedir las
 * respuestas de guía, que son las baratas: sirve para iterar el prompt de la
 * guía sin pagar la lectura completa cada vez. Con `EJEMPLOS_REUSAR=lectura`
 * reutiliza solo la lectura y regenera la activación: para iterar ese prompt.
 *
 * Cuesta dinero real (unas cuatro llamadas al modelo, una de ellas con
 * razonamiento medio). Escribe en `docs/ejemplos-narrativa.md`.
 */

if (!process.env.OPENAI_API_KEY && process.loadEnvFile) {
  process.loadEnvFile('.env.local')
}

// Una carta de muestra: nadie real. Bogotá, 15 de julio de 1990, 08:30.
const NACIMIENTO = {
  birthDate: '1990-07-15',
  birthTime: '08:30',
  timeUnknown: false,
  tz: 'America/Bogota',
  lat: 4.711,
  lng: -74.0721,
}

function contar(texto: string): number {
  return texto.trim().split(/\s+/).filter(Boolean).length
}

it('genera los ejemplos de la narrativa nueva', async () => {
  const instante = resolveBirthInstant(NACIMIENTO)
  const carta = await createLocalChartProvider().calcular({
    utc: instante.utc,
    lat: NACIMIENTO.lat,
    lng: NACIMIENTO.lng,
    tz: NACIMIENTO.tz,
    precision: 'exact',
  })

  const transitos = (await transitosDeHoy(carta)) ?? []
  const hoy = new Date().toISOString().slice(0, 10)

  const partes: string[] = [
    '# Ejemplos de la narrativa nueva',
    '',
    `Generados el ${hoy} con los prompts de la rama \`correcciones-qa-2026-09\`, sobre una carta de muestra (Bogotá, 15 de julio de 1990, 08:30; nadie real). Son salida cruda del modelo, sin retocar, para que se juzgue el tono tal como llegará a una persona.`,
    '',
  ]

  const cache = join(tmpdir(), 'abundance-ejemplos-cache.json')
  const modoReuso = process.env.EJEMPLOS_REUSAR
  const reusar = (modoReuso === '1' || modoReuso === 'lectura') && existsSync(cache)
  const guardado = reusar
    ? (JSON.parse(readFileSync(cache, 'utf8')) as {
        lectura: Awaited<ReturnType<typeof generarLecturaBase>>
        activacion: Awaited<ReturnType<typeof generarActivacionDiaria>>
      })
    : null
  if (guardado && modoReuso === 'lectura') guardado.activacion = undefined as never

  // 1. Lectura personal, con nombre de pila.
  const lectura =
    guardado?.lectura ?? (await generarLecturaBase({ nombre: 'Laura', carta, idioma: 'es' }))
  partes.push('## 1 · Lectura personal (perfil «Laura Gómez»)', '')
  for (const [clave, texto] of Object.entries(lectura)) {
    if (typeof texto !== 'string') continue   // idioma / traducciones no son secciones
    partes.push(`### ${clave} · ${contar(texto)} palabras`, '', texto, '')
  }

  // 2. Activación diaria, día 12 del ciclo.
  const activacion =
    guardado?.activacion ??
    (await generarActivacionDiaria({
      nombre: 'Laura',
      carta,
      transitos,
      dia: 12,
      total: 30,
      fecha: hoy,
      idioma: 'es',
    }))

  writeFileSync(cache, JSON.stringify({ lectura, activacion }))
  const totalActivacion = Object.values(activacion).reduce((n, t) => n + contar(t), 0)
  partes.push(`## 2 · Activación diaria (día 12, ${totalActivacion} palabras en total)`, '')
  for (const [clave, texto] of Object.entries(activacion)) {
    partes.push(`### ${clave}`, '', texto, '')
  }

  // 3. Respuesta de guía con contexto normal.
  const guia = await generarRespuestaGuia({
    nombre: 'Laura',
    carta,
    transitos,
    resumen: lectura.resumen,
    pregunta:
      'Llevo meses queriendo cambiar de trabajo y no doy el paso. ¿Qué me está frenando de verdad?',
    idioma: 'es',
  })
  partes.push(
    `## 3 · Respuesta de guía (${contar(guia.respuesta)} palabras)`,
    '',
    '**Pregunta:** «Llevo meses queriendo cambiar de trabajo y no doy el paso. ¿Qué me está frenando de verdad?»',
    '',
    guia.respuesta,
    '',
  )

  // 4. Poco contexto y nombre comercial: la prueba de que no inventa.
  const nombreComercial = 'Inversiones AOA'
  const sinContexto = await generarRespuestaGuia({
    nombre: nombreDePila(nombreComercial),
    carta,
    transitos,
    resumen: null,
    pregunta: '¿Qué decisión estoy evitando?',
    idioma: 'es',
  })
  partes.push(
    `## 4 · Poco contexto, perfil «${nombreComercial}» (${contar(sinContexto.respuesta)} palabras)`,
    '',
    `**Nombre que llega al modelo:** ${nombreDePila(nombreComercial) ?? '(ninguno: no parece un nombre de pila)'}`,
    '',
    '**Pregunta:** «¿Qué decisión estoy evitando?»',
    '',
    sinContexto.respuesta,
    '',
    '> Qué mirar aquí: que no aparezca un socio, un proyecto, una empresa ni una ruptura que la pregunta no menciona; que proponga una hipótesis y pida el dato que falta; y que no le hable a «Inversiones».',
    '',
  )

  mkdirSync('docs', { recursive: true })
  writeFileSync('docs/ejemplos-narrativa.md', partes.join('\n'))
  console.info('escrito docs/ejemplos-narrativa.md')
}, 600_000)
