import 'server-only'

import { canjearToken, type FalloCanje } from '@/lib/access/landing'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Canjea el token con el que Stripe devuelve al comprador y vincula la compra
 * a la cuenta con la que acaba de entrar.
 *
 * **Aquí es donde deja de existir el agujero.** Antes, quien compraba con un
 * correo y entraba con otra cuenta de Google veía «No encontramos tu compra» y
 * no tenía salida: había pagado y se quedaba fuera. El emparejado por correo
 * era la única vía, y falla siempre que la persona tiene más de una cuenta.
 *
 * El token resuelve eso por diseño: lo emitió la landing al cobrar y **lleva el
 * correo que pagó dentro**. Canjearlo demuestra el pago sin depender de con qué
 * cuenta se autentique después, así que la compra se vincula a `user_id`
 * directamente y los correos ya no tienen por qué coincidir.
 *
 * Se canjea **después** de iniciar sesión, no antes, por dos motivos: el token
 * es de un solo uso y gastarlo sin una cuenta a la que atarlo lo desperdicia,
 * y el contrato pide mandar `appUserId`, que hasta ese momento no existe.
 */
export async function canjearYVincular(
  token: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; fallo: FalloCanje }> {
  const resultado = await canjearToken(token, userId)

  if (!resultado.ok) return resultado

  const acceso = resultado.acceso

  /*
   * Se escribe con el cliente administrativo porque el usuario no tiene
   * `insert` ni `update` sobre `entitlements` — a propósito: si pudiera
   * escribirlo, podría concederse acceso. Y aquí, además, el correo de la
   * compra puede no ser el suyo, así que ninguna política de RLS lo dejaría.
   */
  const db = createAdminClient()

  const { error } = await db.rpc('apply_landing_entitlement', {
    p_email: acceso.email,
    p_status: acceso.status,
    p_plan: acceso.plan ?? null,
    p_source: acceso.source ?? null,
    p_current_period_end: acceso.currentPeriodEnd ?? null,
    p_has_access: acceso.hasAccess,
    p_checked_at: new Date().toISOString(),
    p_user_id: userId,
  } as never)

  if (error) {
    console.error('[activar] no se pudo guardar el acceso canjeado', {
      userId,
      error,
    })
    /*
     * El token ya se gastó en la landing, así que no se puede reintentar el
     * canje — pero tampoco hace falta: un segundo intento devuelve
     * `alreadyRedeemed` con los mismos datos, y el contrato dice que se le deje
     * entrar. Recargar la página vuelve a pasar por aquí.
     */
    return { ok: false, fallo: { motivo: 'error' } }
  }

  return { ok: true }
}
