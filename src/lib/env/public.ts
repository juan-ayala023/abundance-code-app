import { z } from 'zod'

/**
 * Variables públicas: viajan al bundle del cliente.
 * Nunca añadir aquí nada que no pueda ser leído por cualquier visitante.
 *
 * `process.env.NEXT_PUBLIC_*` debe escribirse literal para que Next lo inyecte
 * en build. No acceder por índice dinámico.
 *
 * La validación es perezosa para que importar este módulo no tenga efectos
 * secundarios: `next build` no debe exigir un entorno completo, y los tests
 * deben poder importar el esquema sin configurar nada.
 */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_LANDING_URL: z.url(),
})

export type PublicEnv = z.infer<typeof publicEnvSchema>

let cached: PublicEnv | null = null

export function getPublicEnv(): PublicEnv {
  if (cached) return cached

  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_LANDING_URL: process.env.NEXT_PUBLIC_LANDING_URL,
  })

  if (!parsed.success) {
    const invalid = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')
    throw new Error(`Variables de entorno públicas inválidas o ausentes: ${invalid}`)
  }

  cached = parsed.data
  return cached
}
