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

/** Lugar de nacimiento, tal y como lo devuelve el buscador de ciudades. */
export const lugarSchema = z.object({
  providerId: z.string().min(1),
  city: z.string().min(1),
  region: z.string().nullable(),
  country: z.string(),
  countryCode: z.string(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  tz: z.string().min(1),
})

const FECHA_MINIMA = '1800-01-01'

/**
 * Datos de nacimiento del formulario de onboarding.
 *
 * La coherencia entre `timeUnknown` y `birthTime` se valida aquí, en la base
 * de datos y en el cálculo del instante. Tres capas para la misma regla: es la
 * que decide si la carta lleva casas y ascendente o no.
 */
export const datosNacimientoSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Escribe tu nombre').max(120),
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha no válida')
      .refine((value) => value >= FECHA_MINIMA, 'Fecha demasiado antigua')
      .refine(
        (value) => value <= new Date().toISOString().slice(0, 10),
        'La fecha de nacimiento no puede estar en el futuro',
      ),
    timeUnknown: z.boolean(),
    birthTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora no válida')
      .nullable(),
    place: lugarSchema,
  })
  .refine((data) => !data.timeUnknown || data.birthTime === null, {
    message: 'No puede haber hora si la marcaste como desconocida',
    path: ['birthTime'],
  })
  .refine((data) => data.timeUnknown || data.birthTime !== null, {
    message: 'Indica la hora o marca que no la sabes',
    path: ['birthTime'],
  })

export type DatosNacimiento = z.infer<typeof datosNacimientoSchema>

/** Payload que la landing puede enviar en el deep link `/activar?token=…`. */
export const activarSearchParamsSchema = z.object({
  token: z.string().min(1).optional(),
  next: z.string().optional(),
})
