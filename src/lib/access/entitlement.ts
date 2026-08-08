import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

export type Entitlement = Database['public']['Tables']['entitlements']['Row']
export type EntitlementStatus = Entitlement['status']

/**
 * Estados que conceden acceso al portal.
 *
 * `past_due` queda FUERA a propósito: significa que Stripe no pudo cobrar la
 * renovación. Si el negocio quiere un periodo de gracia, se añade aquí y se
 * decide su duración — es una decisión de producto, no técnica.
 */
const ESTADOS_CON_ACCESO: readonly string[] = ['active', 'trialing']

export function concedeAcceso(status: string): boolean {
  return ESTADOS_CON_ACCESO.includes(status)
}

export type AccessState =
  /** No hay sesión. */
  | { kind: 'anonimo' }
  /** Hay sesión y compra válida. */
  | { kind: 'concedido'; email: string; entitlement: Entitlement }
  /** Hay sesión pero ninguna compra asociada a ese email. */
  | { kind: 'sin-compra'; email: string }
  /** Hay compra, pero cancelada, impagada o expirada. */
  | { kind: 'inactivo'; email: string; entitlement: Entitlement }

/**
 * Resuelve el acceso del usuario de la sesión actual.
 *
 * La fuente de verdad es la tabla `entitlements`, que solo escribe el webhook
 * de Stripe. Aquí únicamente se lee y, si hace falta, se vincula la compra a
 * la cuenta (CLAUDE.md §3).
 */
export async function resolveAccess(): Promise<AccessState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) return { kind: 'anonimo' }

  // RLS deja ver la fila tanto si ya está vinculada por user_id como si solo
  // coincide el email. Por eso una sola lectura cubre los dos casos.
  const { data: entitlement } = await supabase
    .from('entitlements')
    .select('*')
    .maybeSingle()

  if (!entitlement) return { kind: 'sin-compra', email: user.email }

  // Primera vez que este usuario entra tras comprar: se vincula la fila a su
  // cuenta para no depender del email más adelante (por si lo cambia).
  if (entitlement.user_id === null) {
    await supabase.rpc('claim_entitlement')
  }

  if (!concedeAcceso(entitlement.status)) {
    return { kind: 'inactivo', email: user.email, entitlement }
  }

  // Una suscripción activa cuyo periodo ya venció es acceso caducado: el
  // webhook debería haberla movido a `canceled`, pero no dependemos de ello.
  if (
    entitlement.current_period_end !== null &&
    new Date(entitlement.current_period_end) < new Date()
  ) {
    return { kind: 'inactivo', email: user.email, entitlement }
  }

  return { kind: 'concedido', email: user.email, entitlement }
}
