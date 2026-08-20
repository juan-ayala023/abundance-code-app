import { existsSync } from 'node:fs'
import process from 'node:process'

/**
 * Quién ha entrado y se ha quedado sin lo que venía a buscar.
 *
 *   node scripts/clientes-atascados.mjs
 *   npm run atascados
 *
 * Existe por un caso real, y conviene tenerlo escrito porque el fallo no fue el
 * que parecía. El 16 de agosto una clienta entró, completó sus datos, su carta
 * se calculó bien y la llamada al modelo para escribir su lectura falló. El SDK
 * reintenta dos veces por su cuenta, así que fallaron los tres intentos.
 *
 * Eso puede pasar y volverá a pasar: se depende de una API externa. Lo que no
 * puede repetirse es lo que vino después.
 *
 *   1. El fallo no dejó rastro en la base. Solo una línea en un log de servidor
 *      que nadie lee.
 *   2. La app no ofrecía forma de reintentarlo, así que quedó permanente.
 *   3. **Nadie se enteró.** Se descubrió cuatro días más tarde, y solo porque
 *      ella lo comentó de pasada.
 *
 * El punto 2 ya está arreglado —hay botón de reintentar—. Este script es el
 * punto 3: hace visible en cinco segundos lo que costó cuatro días y una
 * conversación afortunada.
 *
 * ---
 *
 * **Lo que este script NO puede ver, y hay que saberlo.** Esta app no cobra ni
 * sabe quién ha pagado: eso lo decide el backend de la landing. Así que aquí solo
 * aparece quien ya ha entrado y ha creado su portal. Alguien que pagó y nunca
 * consiguió entrar —el hueco del correo que no coincide, que el README recoge—
 * es invisible desde aquí, y esa comprobación hay que hacerla del otro lado.
 */

if (existsSync('.env.local') && !process.env.CI) {
  process.loadEnvFile('.env.local')
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const clave = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !clave) {
  console.error(
    'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Con las de producción, este script mira la base real.',
  )
  process.exit(1)
}

/**
 * Margen antes de considerar a alguien atascado.
 *
 * La lectura tarda unos 73 s, y quien acaba de darle a «Continuar» está viendo
 * la pantalla de generación ahora mismo. Contarlo como incidencia haría que el
 * informe tuviera siempre a alguien dentro y dejara de mirarse.
 */
const MINUTOS_DE_GRACIA = 15

const cabeceras = { apikey: clave, Authorization: `Bearer ${clave}` }

async function consultar(ruta) {
  const respuesta = await fetch(`${url}/rest/v1/${ruta}`, { headers: cabeceras })
  if (!respuesta.ok) {
    throw new Error(`${respuesta.status} ${await respuesta.text()}`)
  }
  return respuesta.json()
}

const portales = await consultar(
  'portals?select=user_id,full_name,birth_date,created_at,chart,base_reading,chart_reading&order=created_at.desc',
)

const perfiles = await consultar('profiles?select=id,email')
const correoDe = new Map(perfiles.map((p) => [p.id, p.email]))

const ahora = Date.now()
const enGracia = (fecha) => ahora - new Date(fecha).getTime() < MINUTOS_DE_GRACIA * 60_000

const conDatos = portales.filter((p) => p.birth_date)

/*
 * Tres estados, y solo los dos primeros son incidencias.
 *
 * El retrato se escribe la primera vez que alguien abre `/carta`, así que no
 * tenerlo es lo normal para quien todavía no ha entrado ahí. Se cuenta aparte
 * para no mezclar «algo falló» con «aún no ha pasado por ahí».
 */
const sinCarta = conDatos.filter((p) => !p.chart && !enGracia(p.created_at))
const sinLectura = conDatos.filter((p) => p.chart && !p.base_reading && !enGracia(p.created_at))
const sinRetrato = conDatos.filter((p) => p.base_reading && !p.chart_reading)

function describir(portal) {
  const dias = Math.floor((ahora - new Date(portal.created_at).getTime()) / 86_400_000)
  const correo = correoDe.get(portal.user_id) ?? '(sin perfil)'
  const antiguedad = dias === 0 ? 'hoy' : dias === 1 ? 'hace 1 día' : `hace ${dias} días`
  return `  ${correo}  ·  ${portal.full_name ?? 'sin nombre'}  ·  entró ${antiguedad}`
}

console.log(`Portales con datos de nacimiento: ${conDatos.length}\n`)

if (sinCarta.length) {
  console.log(`⛔ ${sinCarta.length} SIN CARTA — el cálculo falló, y es local:`)
  console.log('   si esto sale, el fallo es nuestro, no de un proveedor.')
  sinCarta.forEach((p) => console.log(describir(p)))
  console.log()
}

if (sinLectura.length) {
  console.log(`⛔ ${sinLectura.length} SIN LECTURA BASE — es lo que la persona compró:`)
  console.log('   pueden reintentarlo solos desde Lectura Base, pero no lo saben.')
  console.log('   Merece un correo diciéndoselo.')
  sinLectura.forEach((p) => console.log(describir(p)))
  console.log()
}

if (sinRetrato.length) {
  console.log(`· ${sinRetrato.length} sin retrato de carta (normal si no han abierto Tu Carta Natal).`)
}

if (!sinCarta.length && !sinLectura.length) {
  console.log('✅ Nadie atascado. Todo el que entró tiene su carta y su lectura.')
}

/*
 * Sale con código 1 si hay alguien atascado, para que esto se pueda encadenar
 * en una tarea programada y avise sin que nadie tenga que leer la salida.
 */
if (sinCarta.length || sinLectura.length) process.exit(1)
