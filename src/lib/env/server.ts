import 'server-only'

import { z } from 'zod'

/**
 * Secretos de servidor. El import de `server-only` hace que el build falle
 * si este módulo entra por error en un Client Component.
 *
 * Solo la clave de Supabase es obligatoria: es la que necesita cualquier
 * escritura de sistema. El resto se declara opcional y se exige en el momento
 * de usarla, con `requireServerEnv`.
 *
 * El motivo no es comodidad. Si todas fueran obligatorias, desplegar el webhook
 * de Stripe exigiría tener configurada la clave de IA, que no tiene nada que
 * ver — y cuando falta, el error aparece disfrazado de otra cosa en la primera
 * función que toque el entorno.
 */
/**
 * Una variable declarada pero vacía cuenta como ausente.
 *
 * Los archivos .env se escriben con marcadores vacíos (`ANTHROPIC_API_KEY=`),
 * y una cadena vacía SÍ está presente para zod: sin esta conversión, `.optional()`
 * no se aplica y el esquema falla por variables que nadie ha configurado todavía.
 */
const opcional = z.preprocess(
  (valor) => (typeof valor === 'string' && valor.trim() === '' ? undefined : valor),
  z.string().min(1).optional(),
)

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  /*
   * Backend de la landing: es quien cobra y, por tanto, quien sabe quién ha
   * pagado. Ver `src/lib/access/landing.ts` y `BRIEF-APP-INTEGRACION.md`.
   */
  LANDING_API_URL: opcional,
  APP_SHARED_SECRET: opcional,
  STRIPE_SECRET_KEY: opcional,
  STRIPE_WEBHOOK_SECRET: opcional,
  ANTHROPIC_API_KEY: opcional,
  OPENAI_API_KEY: opcional,
  GEOCODING_API_KEY: opcional,
  ACCESS_SHARED_SECRET: opcional,
  /*
   * Correos con acceso de cortesía, separados por comas. Ver
   * `src/lib/access/cortesia.ts`: es la única puerta de acceso que no decide la
   * landing, y por eso vive en una variable de servidor —que solo cambia quien
   * entra en Railway— y no en la base, donde una fila de más pasaría inadvertida.
   */
  ACCESOS_CORTESIA: opcional,
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

/** Variables opcionales en el esquema pero obligatorias para alguna función. */
export type ServerEnvOpcional = Exclude<keyof ServerEnv, 'SUPABASE_SERVICE_ROLE_KEY'>

let cached: ServerEnv | null = null

export function getServerEnv(): ServerEnv {
  if (cached) return cached

  const parsed = serverEnvSchema.safeParse(process.env)

  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')
    // El detalle va al log del servidor; nunca a la respuesta del usuario.
    throw new Error(`Variables de entorno de servidor inválidas o ausentes: ${missing}`)
  }

  cached = parsed.data
  return cached
}

export class MissingEnvError extends Error {}

/**
 * Exige una variable concreta en el punto donde hace falta.
 *
 * `para` describe la función que la necesita, de modo que el log diga
 * "falta X para el webhook de Stripe" en vez de un fallo genérico de entorno.
 */
export function requireServerEnv(name: ServerEnvOpcional, para: string): string {
  const value = getServerEnv()[name]

  if (!value) {
    throw new MissingEnvError(`Falta la variable de entorno ${name}, necesaria para ${para}.`)
  }

  return value
}

/** Solo para reiniciar el estado entre tests. */
export function resetServerEnvCache() {
  cached = null
}
