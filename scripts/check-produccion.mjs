import { existsSync } from 'node:fs'
import process from 'node:process'

/**
 * Comprobación del entorno ANTES de desplegar.
 *
 *   node scripts/check-produccion.mjs          # contra el .env.local de tu máquina
 *   npm run check:produccion
 *
 * No sustituye a `verify`: `verify` comprueba que el código está bien, esto
 * comprueba que el ENTORNO lo está. Son fallos distintos y el segundo no lo ve
 * ninguna prueba, porque las pruebas corren con su propio entorno.
 *
 * Lo que se busca evitar es el desplegar-y-descubrir: una variable ausente, una
 * clave de test en producción, o el error caro de todos —claves live y de test
 * mezcladas—, que no rompe el build ni el arranque, sino que hace que el
 * webhook rechace en silencio TODOS los pagos por firma no válida. Los clientes
 * pagan y no reciben acceso, y en el log solo pone «firma no válida».
 *
 * Nunca imprime el valor de una clave: solo su prefijo y su longitud.
 */

if (existsSync('.env.local') && !process.env.CI) {
  process.loadEnvFile('.env.local')
}

/** `--produccion` exige lo que solo se exige al salir a producción. */
const PRODUCCION = process.argv.includes('--produccion')

const errores = []
const avisos = []

function error(mensaje) {
  errores.push(mensaje)
}
function aviso(mensaje) {
  avisos.push(mensaje)
}

const env = process.env
const valor = (nombre) => {
  const v = env[nombre]
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null
}

// --- Presencia -------------------------------------------------------------

const OBLIGATORIAS = [
  ['NEXT_PUBLIC_SUPABASE_URL', 'conectar con la base de datos'],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'la sesión del navegador'],
  ['SUPABASE_SERVICE_ROLE_KEY', 'que el servidor escriba saltándose RLS'],
  ['NEXT_PUBLIC_LANDING_URL', 'enviar a comprar sin escribir el dominio en el código'],
  /*
   * Estas dos son las que deciden quién entra. Quien cobra es la landing, así
   * que quien sabe quién ha pagado es su backend: sin URL ni secreto, el canje
   * del token no puede ocurrir y **ningún comprador obtiene acceso**.
   *
   * Aquí estaban antes las claves de Stripe, cuando esta app tenía su propio
   * webhook. Ya no: el contrato entre los dos equipos se lo prohíbe.
   */
  ['OPENAI_API_KEY', 'generar lectura, activaciones y guía'],
  ['GEOCODING_API_KEY', 'resolver la ciudad de nacimiento en el onboarding'],
]

for (const [nombre, para] of OBLIGATORIAS) {
  if (!valor(nombre)) error(`Falta ${nombre} — necesaria para ${para}.`)
}

/*
 * En producción son imprescindibles; en local no.
 *
 * Sin ellas la integración se degrada sola y el acceso se sirve de la caché
 * local, que es la degradación que el contrato pide para cuando su backend no
 * está disponible. Sirve para desarrollar. Lo que no sirve es para vender:
 * desplegado, sin esto el canje del token no ocurre y **ningún comprador entra**.
 */
const SOLO_PRODUCCION = [
  ['LANDING_API_URL', 'canjear el token de acceso: sin esto NADIE obtiene acceso'],
  ['APP_SHARED_SECRET', 'autenticarse contra el backend de la landing'],
]

for (const [nombre, para] of SOLO_PRODUCCION) {
  if (valor(nombre)) continue
  const mensaje = `Falta ${nombre} — necesaria para ${para}.`
  if (PRODUCCION) error(mensaje)
  else aviso(`${mensaje} En local el acceso se sirve de la caché.`)
}

/* -----------------------------------------------------------------------------
 * Stripe — solo si alguien las dejó puestas.
 *
 * Esta app ya no cobra ni escucha webhooks: lo hace el backend de la landing.
 * Las claves de Stripe no son obligatorias, pero si aparecen se revisan igual,
 * porque una `sk_live` olvidada en el entorno es una llave de más dando vueltas.
 * ---------------------------------------------------------------------------*/

const claveStripe = valor('STRIPE_SECRET_KEY')

if (claveStripe) {
  /*
   * El README lo dice y conviene que falle solo: esta app no cobra. Una clave
   * secreta completa le daría capacidad de cobrar y reembolsar que no usa para
   * nada. Debe ser una clave RESTRINGIDA (`rk_`) con permisos mínimos.
   */
  if (claveStripe.startsWith('sk_live_')) {
    error(
      'STRIPE_SECRET_KEY es una clave secreta COMPLETA de modo live (sk_live_). ' +
        'Esta app no cobra: usa una clave restringida (rk_live_) con solo ' +
        '«Billing Portal Sessions: write» y «Customers: read».',
    )
  }

  const esLive = claveStripe.includes('_live_')

  /*
   * Ya no es un error: esta app no habla con Stripe. Es una llave de más dando
   * vueltas por el entorno, y lo suyo es quitarla.
   */
  if (PRODUCCION) {
    aviso(
      `STRIPE_SECRET_KEY sigue configurada (${prefijo(claveStripe)}) y esta app ya no ` +
        'usa Stripe: lo hace el backend de la landing. Puedes quitarla del entorno.',
    )
  } else if (esLive) {
    aviso(`STRIPE_SECRET_KEY es de modo LIVE (${prefijo(claveStripe)}) fuera de producción.`)
  }
}

const secretoWebhook = valor('STRIPE_WEBHOOK_SECRET')

if (secretoWebhook && !secretoWebhook.startsWith('whsec_')) {
  error(
    `STRIPE_WEBHOOK_SECRET no empieza por «whsec_» (${prefijo(secretoWebhook)}). ` +
      'Se confunde a menudo con la clave de API del endpoint; el que hace falta ' +
      'es el «Signing secret» del endpoint concreto.',
  )
}

/*
 * El aviso que no se puede automatizar, y por eso se escribe.
 *
 * Un `whsec_` de test y otro de live son indistinguibles a simple vista: los
 * dos empiezan igual y miden lo mismo. Si el secreto no corresponde al modo del
 * endpoint que envía, la firma no valida NUNCA y todos los pagos se pierden en
 * silencio. Solo se comprueba enviando un evento de prueba desde el endpoint
 * correcto y mirando que la respuesta sea 200.
 */
if (secretoWebhook && claveStripe?.includes('_live_')) {
  aviso(
    'Comprueba a mano que STRIPE_WEBHOOK_SECRET es el del endpoint en modo LIVE. ' +
      'Un secreto de test es idéntico a la vista y haría fallar la firma de todos ' +
      'los pagos reales sin más señal que «firma no válida» en el log.',
  )
}

// --- URLs ------------------------------------------------------------------

const landing = valor('NEXT_PUBLIC_LANDING_URL')
if (landing && PRODUCCION && !landing.startsWith('https://')) {
  error(`NEXT_PUBLIC_LANDING_URL debe ser https en producción (es ${landing}).`)
}

const supabaseUrl = valor('NEXT_PUBLIC_SUPABASE_URL')
if (supabaseUrl && PRODUCCION) {
  /*
   * El proyecto actual se llama `abundance-code-dev` y vive bajo una cuenta
   * institucional que se desactiva al terminar los estudios (README). Salir a
   * producción sobre él significa que dev y producción comparten base de datos
   * y que el acceso puede perderse. No se puede comprobar por el nombre —la URL
   * es una referencia opaca—, así que se pide confirmación explícita.
   */
  if (!valor('SUPABASE_PROYECTO_CONFIRMADO')) {
    error(
      'Falta SUPABASE_PROYECTO_CONFIRMADO=sí. Antes de producción hay que decidir ' +
        'si la base es la definitiva: hoy el proyecto es «abundance-code-dev», bajo ' +
        'una cuenta institucional que caduca. Ponla cuando lo hayas revisado.',
    )
  }
}

// --- Conexión real con el backend de la landing ----------------------------

/*
 * Que las dos variables estén puestas no significa que sean las correctas.
 *
 * Un secreto que no coincide con el suyo no rompe el build ni el arranque:
 * simplemente hace que TODOS los canjes devuelvan 401, y el comprador se queda
 * fuera sin más señal que «no autorizado» en el log. Es el mismo tipo de fallo
 * silencioso que el `whsec_` cruzado, y se comprueba igual: llamando de verdad.
 *
 * Solo se imprime el código de respuesta. El secreto nunca sale por pantalla.
 */
async function comprobarLanding() {
  const url = valor('LANDING_API_URL')
  const secreto = valor('APP_SHARED_SECRET')

  if (!url || !secreto) return

  const destino = `${url.replace(/\/$/, '')}/api/access/status?email=comprobacion@example.invalid`

  let respuesta
  try {
    respuesta = await fetch(destino, {
      headers: { Authorization: `Bearer ${secreto}` },
      signal: AbortSignal.timeout(10_000),
    })
  } catch (causa) {
    error(`No se pudo hablar con LANDING_API_URL (${url}): ${causa.message}`)
    return
  }

  if (respuesta.status === 200) {
    console.log('  ok     El backend de la landing acepta nuestro secreto.')
    return
  }

  if (respuesta.status === 401) {
    error(
      'El backend de la landing devuelve 401: el APP_SHARED_SECRET de aquí NO coincide ' +
        'con el suyo. Desplegado así, ningún comprador obtendría acceso.',
    )
    return
  }

  if (respuesta.status === 503) {
    error(
      'El backend de la landing devuelve 503: a ELLOS les falta APP_SHARED_SECRET ' +
        'en su entorno. Hay que avisarles, no es un problema de este lado.',
    )
    return
  }

  aviso(`El backend de la landing respondió ${respuesta.status}, que no esperábamos.`)
}

await comprobarLanding()

// --- Salida ----------------------------------------------------------------

function prefijo(clave) {
  return `${clave.slice(0, 8)}…, ${clave.length} caracteres`
}

for (const a of avisos) console.warn(`  aviso  ${a}`)
for (const e of errores) console.error(`  ERROR  ${e}`)

if (errores.length > 0) {
  console.error(
    `\nEntorno no apto${PRODUCCION ? ' para producción' : ''}: ${errores.length} problema(s).`,
  )
  process.exit(1)
}

console.log(
  `Entorno correcto${PRODUCCION ? ' para producción' : ''}` +
    `${avisos.length ? ` (${avisos.length} aviso(s) que revisar a mano)` : ''}.`,
)
