import 'server-only'

import { getServerEnv } from '@/lib/env/server'

/**
 * Acceso de cortesía: quien entra sin haber comprado.
 *
 * La propietaria del negocio, y quien tenga que enseñar o revisar el producto,
 * necesitan verlo por dentro sin pasar por el pago. Hasta ahora no había forma:
 * el acceso lo decide el backend de la landing (`BRIEF-APP-INTEGRACION.md`), y a
 * quien no ha comprado le responde `hasAccess: false`.
 *
 * **Esto es, a sabiendas, una segunda fuente de verdad sobre el acceso**, que es
 * justo lo que el cambio de contrato vino a eliminar. Se acepta porque está
 * acotada de la única forma que la hace segura: una lista explícita de correos,
 * escrita a mano, que no concede nada a nadie más y que no puede crecer sola.
 * Todo lo que no esté en ella sigue decidiéndolo la landing, sin excepción.
 *
 * Por qué en una variable de entorno y no en la base:
 *
 *   1. **No la revoca la revalidación.** Una fila puesta a mano en
 *      `entitlements` dura menos de un día: `revalidarSiToca()` pregunta a la
 *      landing cada 24 h, recibe «no tiene acceso» y la sobrescribe. El acceso
 *      se caería solo, sin aviso y probablemente en mitad de una demostración.
 *   2. **Se ve.** Cambiarla exige entrar en Railway y queda en la configuración
 *      del servicio. Una fila más en una tabla de miles no la mira nadie.
 *   3. **Se retira igual de rápido.** Quitar el correo de la lista y desplegar.
 *
 * Lo que **no** es: un modo administrador. No da permisos extra sobre nada ni
 * deja ver datos de otros. Concede exactamente lo que concede una compra, y las
 * políticas RLS siguen aplicándose igual, que es lo que impide ver portales
 * ajenos.
 */

/** Estado que se le asigna. No es de Stripe: no viene de una compra. */
export const ESTADO_CORTESIA = 'cortesia'

/**
 * Los correos de la lista, normalizados.
 *
 * Se filtran las entradas vacías a propósito. `ACCESOS_CORTESIA=","` o una coma
 * de más produciría una cadena vacía en la lista, y comparar contra ella
 * dependería de que el correo del usuario nunca lo sea. No hace falta correr ese
 * riesgo por una coma mal puesta.
 */
export function correosDeCortesia(): string[] {
  const crudo = getServerEnv().ACCESOS_CORTESIA
  if (!crudo) return []

  return crudo
    .split(',')
    .map((correo) => correo.trim().toLowerCase())
    .filter((correo) => correo.length > 0)
}

/**
 * ¿Tiene este correo acceso de cortesía?
 *
 * La comparación ignora mayúsculas porque el correo llega de Google tal y como
 * lo escribió la persona, y quien rellena la lista lo escribe a mano: que
 * `Maria@Gmail.com` y `maria@gmail.com` no coincidieran sería un fallo mudo, del
 * tipo que se diagnostica mirando la pantalla de «no encontramos tu compra».
 */
export function esCortesia(email: string | null | undefined): boolean {
  if (!email) return false

  const normalizado = email.trim().toLowerCase()
  if (!normalizado) return false

  return correosDeCortesia().includes(normalizado)
}
