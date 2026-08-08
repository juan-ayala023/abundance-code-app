import 'server-only'

import { z } from 'zod'

/**
 * Secretos de servidor. El import de `server-only` hace que el build falle
 * si este módulo entra por error en un Client Component.
 *
 * Se valida de forma perezosa (`getServerEnv()`) y no en la carga del módulo,
 * para que `next build` no exija secretos de producción en tiempo de compilación.
 */
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1).optional(),
  GEOCODING_API_KEY: z.string().min(1).optional(),
  ACCESS_SHARED_SECRET: z.string().min(1).optional(),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

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
