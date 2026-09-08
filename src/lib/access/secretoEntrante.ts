import 'server-only'

import crypto from 'node:crypto'

import { getServerEnv } from '@/lib/env/server'

/**
 * Autenticación de las llamadas que ENTRAN desde el backend de la landing.
 *
 * Hasta ahora el secreto compartido viajaba en un solo sentido: esta app
 * preguntaba a la landing quién había pagado (`landing.ts`). El panel de
 * administración necesita el sentido contrario —la landing pregunta a esta app
 * quién se ha registrado y quién tiene acceso— porque la lista de cortesías
 * vive aquí, en una variable de entorno, y no en ninguna base que la landing
 * pueda consultar.
 *
 * Se reutiliza `APP_SHARED_SECRET` y no se crea un secreto nuevo: es el mismo
 * par de sistemas confiando el uno en el otro, y cada secreto adicional es una
 * variable más que alguien tiene que recordar rotar en dos sitios a la vez.
 */

/**
 * Comparación en tiempo constante, igual que en el `appAuth.js` del backend.
 *
 * `timingSafeEqual` exige buffers de la misma longitud y lanza si no lo son,
 * así que la diferencia de longitud se resuelve antes. Eso filtra la longitud
 * del secreto, que no es un dato sensible: lo que se protege es su contenido.
 */
function igualSeguro(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)

  if (bufA.length !== bufB.length) return false

  return crypto.timingSafeEqual(bufA, bufB)
}

/** Lee el secreto de la petición: `Authorization: Bearer …` o `x-app-secret`. */
function secretoDe(request: Request): string {
  const cabecera = request.headers.get('authorization') ?? ''

  if (cabecera.startsWith('Bearer ')) return cabecera.slice(7)

  return request.headers.get('x-app-secret') ?? ''
}

export type ResultadoAutorizacion =
  | { ok: true }
  /** `motivo` va al log del servidor, nunca a la respuesta. */
  | { ok: false; estado: 401 | 503; motivo: string }

/**
 * ¿Viene esta petición del backend de la landing?
 *
 * Sin `APP_SHARED_SECRET` configurado responde 503 y no 401, a propósito: la
 * llamada no es incorrecta, es esta app la que no está configurada para
 * atenderla. Un 401 mandaría a quien depura a revisar el secreto del que llama,
 * que es el sitio equivocado.
 */
export function autorizaLlamadaDeLanding(request: Request): ResultadoAutorizacion {
  const esperado = getServerEnv().APP_SHARED_SECRET

  if (!esperado) {
    return {
      ok: false,
      estado: 503,
      motivo: 'falta APP_SHARED_SECRET: no se pueden atender llamadas de la landing',
    }
  }

  if (!igualSeguro(secretoDe(request), esperado)) {
    return { ok: false, estado: 401, motivo: 'secreto compartido incorrecto o ausente' }
  }

  return { ok: true }
}
