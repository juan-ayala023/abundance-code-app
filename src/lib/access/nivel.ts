import { tieneAcceso } from './entitlement'

/**
 * Qué puede usar esta persona.
 *
 * Dos niveles, y **una sola regla**: lo que diga `has_access`, que calcula el
 * backend de la landing. Quien cobra decide quién es cliente.
 *
 *   1. Con acceso vigente  -> todo.
 *   2. Sin acceso vigente  -> la lectura base y la carta se quedan; la guía y
 *                             las activaciones piden suscripción.
 *
 * **La lectura base nunca se retira.** Es lo que la persona compró y ya leyó:
 * quitársela después sería cambiarle el trato, y el producto se lo promete por
 * escrito en Mi Cuenta.
 *
 * ---
 *
 * **Por qué el ciclo de 30 días ya no decide nada, que es un cambio grande.**
 *
 * Antes la regla era «pasados los 30 días, sin suscripción, solo lectura», y se
 * distinguía la suscripción de la compra suelta por `stripe_subscription_id`.
 * Eso venía de suponer que podía haber pagos únicos.
 *
 * El precio real es **49 $ el primer mes y 14,99 $/mes después**, montado en
 * Stripe como **una sola suscripción con 30 días de trial** más un cargo único.
 * De ahí salen dos cosas:
 *
 * - **No existen las compras sueltas.** Todo comprador es suscriptor desde el
 *   primer día, así que la rama «sin suscripción» no describía a nadie.
 * - **Ya no guardamos ids de Stripe.** El contrato lo prohíbe expresamente, así
 *   que `stripe_subscription_id` viene vacío siempre. Mantener aquella regla
 *   habría dejado sin guía **a todo el mundo el día 31** — justo a quienes
 *   acababan de pagar su primer mes.
 *
 * El ciclo sigue existiendo para contar «Día N de 30» en pantalla. Lo que ya no
 * hace es decidir quién entra.
 */

export type NivelAcceso =
  /** Guía, activaciones y lectura. */
  | 'completo'
  /** Solo lectura base y carta. La guía y las activaciones piden suscripción. */
  | 'solo-lectura'

export type EntitlementParaNivel = {
  status: string
  /** Lo calcula el backend de la landing. Es lo que manda. */
  has_access?: boolean | null
} | null

export function nivelDeAcceso(entitlement: EntitlementParaNivel): NivelAcceso {
  /*
   * Sin compra el layout ya ha redirigido antes de llegar aquí. Si aun así se
   * llegara, se concede el nivel completo: cerrar la guía por un dato ausente
   * castigaría a quien acaba de entrar, y el acceso a la app ya se comprobó.
   */
  if (!entitlement) return 'completo'

  return tieneAcceso(entitlement) ? 'completo' : 'solo-lectura'
}

/** Lo que se le dice al usuario cuando una sección pide suscripción. */
export const MENSAJE_SOLO_LECTURA =
  'Tu suscripción no está activa ahora mismo. Tu lectura base y tu carta natal siguen siendo tuyas y seguirán aquí. La guía personalizada y las activaciones diarias necesitan una suscripción activa.'
