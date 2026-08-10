import 'server-only'

import { cache } from 'react'

import { consultarEstado, integracionConfigurada } from '@/lib/access/landing'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

export type Entitlement = Database['public']['Tables']['entitlements']['Row']
export type EntitlementStatus = Entitlement['status']

/**
 * Estados que conceden acceso, para las filas que aún no tienen `has_access`.
 *
 * Es un respaldo, no la regla. La regla la calcula el backend de la landing y
 * llega en `has_access` (§3.2 del contrato): «Usad hasAccess, no status. El
 * backend lo calcula. Si mañana cambian las reglas de gracia, la app no se
 * entera.»
 *
 * Nótese que **su regla y la nuestra no coincidían**: para ellos `past_due`
 * concede acceso —es la gracia por impago— y aquí quedaba fuera. Quien cobra
 * decide quién es cliente, así que manda la suya.
 */
const ESTADOS_CON_ACCESO: readonly string[] = ['active', 'trialing', 'past_due']

export function concedeAcceso(status: string): boolean {
  return ESTADOS_CON_ACCESO.includes(status)
}

/**
 * ¿Tiene acceso esta compra?
 *
 * `has_access` manda cuando existe. El respaldo por `status` cubre las filas
 * escritas por el webhook de Stripe antes de este cambio.
 */
export function tieneAcceso(entitlement: {
  status: string
  has_access?: boolean | null
}): boolean {
  return entitlement.has_access ?? concedeAcceso(entitlement.status)
}

/**
 * Cada cuánto se vuelve a preguntar a la landing.
 *
 * El contrato lo pide así (§3.2): «Guardad el resultado en vuestra propia base
 * y revalidadlo una vez al día o al iniciar sesión — no en cada carga de
 * pantalla. Si el backend de la web se cae, los usuarios ya validados tienen
 * que poder seguir usando la app.»
 *
 * Preguntar en cada pantalla convertiría su disponibilidad en la nuestra: una
 * caída suya dejaría a todo el mundo fuera de una app que no cobra nada.
 */
const HORAS_ENTRE_REVALIDACIONES = 24

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
 * La compra, tanto si sigue vigente como si no.
 *
 * Existe porque `'inactivo'` **también tiene compra**: es quien pagó y luego
 * canceló o dejó de pagar. Leer el entitlement solo en `'concedido'` —que es lo
 * que se hacía— hacía que a esa persona se la tratara como si nunca hubiera
 * comprado, y con el modelo de precios real (49 $ y luego 15 $/mes) esa es la
 * situación de **todo el que se da de baja**, no un caso raro.
 */
export function entitlementDe(access: AccessState): Entitlement | null {
  return access.kind === 'concedido' || access.kind === 'inactivo'
    ? access.entitlement
    : null
}

/**
 * Resuelve el acceso del usuario de la sesión actual.
 *
 * La fuente de verdad es la tabla `entitlements`, que solo escribe el webhook
 * de Stripe. Aquí únicamente se lee y, si hace falta, se vincula la compra a
 * la cuenta (CLAUDE.md §3).
 */
export const resolveAccess = cache(async function resolveAccess(): Promise<AccessState> {
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

  const vigente = await revalidarSiToca(entitlement)

  if (!tieneAcceso(vigente)) {
    return { kind: 'inactivo', email: user.email, entitlement: vigente }
  }

  return { kind: 'concedido', email: user.email, entitlement: vigente }
})

/**
 * Vuelve a preguntar a la landing si hace más de un día que no se hace.
 *
 * Devuelve siempre un entitlement utilizable: si su backend no contesta, se
 * conserva el que había. **Que su servidor se caiga no puede echar de la app a
 * quien ya estaba validado** — lo pide el contrato y además es lo correcto: esta
 * app no cobra, así que no tiene por qué heredar la disponibilidad de la que sí.
 *
 * Antes había aquí una comprobación propia de `current_period_end` vencido. Se
 * ha quitado: con el precio real —49 $ y un trial de 30 días— ese campo apunta
 * al día 31, que es cuando cae el primer cobro mensual, no cuando termina el
 * acceso. Interpretarlo como caducidad habría echado a **todo el mundo** justo
 * al renovar. Quién sigue siendo cliente lo dice `has_access`, y solo ellos.
 */
async function revalidarSiToca(entitlement: Entitlement): Promise<Entitlement> {
  if (!integracionConfigurada()) return entitlement
  if (!tocaRevalidar(entitlement.last_checked_at)) return entitlement

  const estado = await consultarEstado(entitlement.email)
  if (!estado) return entitlement

  const db = createAdminClient()

  const { data, error } = await db.rpc('apply_landing_entitlement', {
    p_email: estado.email,
    p_status: estado.status,
    p_plan: estado.plan ?? null,
    p_source: estado.source ?? null,
    p_current_period_end: estado.currentPeriodEnd ?? null,
    p_has_access: estado.hasAccess,
    p_checked_at: new Date().toISOString(),
    // No se toca la vinculación: de eso se encarga el canje del token.
    p_user_id: entitlement.user_id,
  } as never)

  if (error) {
    console.error('[acceso] no se pudo guardar la revalidación', error)
    return entitlement
  }

  const fila = Array.isArray(data) ? data[0] : null
  return (fila as Entitlement | null) ?? entitlement
}

function tocaRevalidar(ultima: string | null): boolean {
  if (!ultima) return true

  const cuando = new Date(ultima).getTime()
  if (Number.isNaN(cuando)) return true

  return Date.now() - cuando > HORAS_ENTRE_REVALIDACIONES * 3_600_000
}
