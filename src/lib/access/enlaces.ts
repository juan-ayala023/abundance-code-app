import { getPublicEnv } from '@/lib/env/public'

/**
 * Enlaces a la landing que esta app no sirve.
 *
 * Quien cobra es la landing, así que cada botón de comprar o renovar sale de
 * aquí. El dominio ya cambió una vez —de `abundacecode.com` a
 * `abundancecode.us`— y por eso sale siempre de `NEXT_PUBLIC_LANDING_URL` y no
 * de un literal.
 */

/**
 * Página de precios de la landing.
 *
 * Es el destino real de «ir a comprar»: la raíz deja al usuario en la portada,
 * arriba del todo, teniendo que buscar por su cuenta la sección de pago que
 * acaba de pedir. Quien pulsa comprar tiene que aterrizar en el precio.
 */
export function urlDeCompra(): string {
  const landing = getPublicEnv().NEXT_PUBLIC_LANDING_URL.replace(/\/$/, '')
  return `${landing}/pricing`
}

/** Portada de la web, para quien llega a la app sin saber qué es. */
export function urlDeLanding(): string {
  return getPublicEnv().NEXT_PUBLIC_LANDING_URL.replace(/\/$/, '')
}
