import { z } from 'zod'

/**
 * Ruta interna de redirección tras el login.
 *
 * Debe empezar por una sola barra. Rechazar `//evil.com` y `/\evil.com` es lo
 * que impide un open redirect: el navegador los interpreta como URLs absolutas
 * a otro dominio, así que un atacante podría enviar a la víctima a una copia
 * del portal usando un enlace que aparenta ser nuestro.
 */
export const nextPathSchema = z
  .string()
  .startsWith('/')
  .refine((value) => !value.startsWith('//') && !value.startsWith('/\\'), {
    message: 'ruta externa',
  })

export function safeNextPath(value: string | null | undefined, fallback = '/portal'): string {
  const parsed = nextPathSchema.safeParse(value)
  return parsed.success ? parsed.data : fallback
}

/** Payload que la landing puede enviar en el deep link `/activar?token=…`. */
export const activarSearchParamsSchema = z.object({
  token: z.string().min(1).optional(),
  next: z.string().optional(),
})
