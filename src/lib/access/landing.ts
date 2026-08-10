import 'server-only'

import { z } from 'zod'

import { getServerEnv, requireServerEnv } from '@/lib/env/server'

/**
 * Cliente del backend de la landing.
 *
 * Quien cobra es la landing, así que quien sabe quién ha pagado es la landing.
 * El contrato entre los dos equipos (`BRIEF-APP-INTEGRACION.md`) lo dice sin
 * ambigüedad: «La app no cobra nada. No necesita Stripe, ni claves, ni
 * webhooks. Sólo pregunta al backend de la web quién ha pagado.»
 *
 * Tres llamadas, y ninguna se hace desde el navegador:
 *
 *   POST /api/access/redeem        canjear el token de la URL
 *   GET  /api/access/status        ¿sigue teniendo acceso?
 *   POST /api/stripe/portal        abrir el portal de facturación de Stripe
 *
 * Las dos primeras van firmadas con un secreto compartido que **jamás** puede
 * llegar al cliente. Su CORS solo acepta peticiones de navegador desde su
 * propio dominio, así que además de inseguro sería inútil intentarlo.
 */

/** Lo que su backend llama `toEntitlement()`. Nada de ids de Stripe. */
const accesoSchema = z.object({
  email: z.string(),
  name: z.string().nullable().optional(),
  plan: z.string().nullable().optional(),
  /*
   * `incomplete` es suyo y no estaba en nuestro dominio. `catch` evita que un
   * estado nuevo por su parte tumbe la pantalla: se degrada a 'none' y el
   * acceso lo decide `hasAccess`, que es lo que manda.
   */
  status: z
    .enum(['active', 'trialing', 'past_due', 'canceled', 'incomplete', 'none'])
    .catch('none'),
  source: z.string().nullable().optional(),
  currentPeriodEnd: z.string().nullable().optional(),
  /*
   * El contrato es explícito (§3.2): «Usad hasAccess, no status. El backend lo
   * calcula (active o past_due → true). Si mañana cambian las reglas de gracia,
   * la app no se entera.»
   *
   * No es un matiz: su `past_due` concede acceso —es la gracia por impago— y
   * nuestro `concedeAcceso()` lo excluía. Decidirlo por nuestra cuenta sería
   * cerrarle la app a alguien a quien ellos siguen considerando cliente.
   */
  hasAccess: z.boolean(),
  utmCampaign: z.string().nullable().optional(),
})

export type AccesoLanding = z.infer<typeof accesoSchema>

const canjeSchema = accesoSchema.extend({
  alreadyRedeemed: z.boolean().optional(),
  redeemedAt: z.string().nullable().optional(),
})

export type CanjeLanding = z.infer<typeof canjeSchema>

/**
 * Motivos por los que un canje no sale adelante.
 *
 * `caducado` no es un error del usuario y tiene salida propia: la landing tiene
 * una página que le reenvía el enlace, y el correo viene en la respuesta para
 * poder prerrellenarla. Distinguirlo de `no-encontrado` es la diferencia entre
 * «pide otro enlace» y un callejón sin salida.
 */
export type FalloCanje =
  | { motivo: 'no-encontrado' }
  | { motivo: 'caducado'; email: string | null }
  | { motivo: 'sin-configurar' }
  | { motivo: 'error' }

export type ResultadoCanje =
  | { ok: true; acceso: CanjeLanding }
  | { ok: false; fallo: FalloCanje }

/** Página de la landing que reenvía el enlace de acceso caducado. */
export const URL_REENVIO = 'https://abundacecode.com/activar-acceso'

/*
 * Un backend que no responde no puede dejar colgada una pantalla. El contrato
 * asume que la app sobrevive a sus caídas, y sin plazo la petición se quedaría
 * esperando hasta que la corte el servidor.
 */
const TIEMPO_MAXIMO_MS = 8_000

/**
 * ¿Está acordada ya la integración con la landing?
 *
 * Hasta que los dos equipos intercambien la URL de su backend y el secreto, no
 * hay a quién preguntar. Sin esta comprobación, cada carga de pantalla
 * intentaría una llamada que no puede salir y llenaría el log de ruido — y en
 * las pruebas e2e, que corren sin integración a propósito, cada navegación.
 *
 * Que falte no rompe nada: el acceso se sirve desde la caché local, que es
 * exactamente la degradación que el contrato pide para cuando su backend no
 * está disponible.
 */
export function integracionConfigurada(): boolean {
  const env = getServerEnv()
  return Boolean(env.LANDING_API_URL && env.APP_SHARED_SECRET)
}

function baseUrl(): string {
  return requireServerEnv(
    'LANDING_API_URL',
    'preguntar al backend de la landing quién ha pagado',
  ).replace(/\/$/, '')
}

function cabeceras(): HeadersInit {
  return {
    Authorization: `Bearer ${requireServerEnv(
      'APP_SHARED_SECRET',
      'autenticar esta app contra el backend de la landing',
    )}`,
    'Content-Type': 'application/json',
  }
}

async function pedir(ruta: string, init: RequestInit): Promise<Response> {
  return fetch(`${baseUrl()}${ruta}`, {
    ...init,
    headers: { ...cabeceras(), ...init.headers },
    signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    // Nunca cachear: es estado de pago, y servirlo viejo es dar o quitar acceso.
    cache: 'no-store',
  })
}

/**
 * Canjea el token con el que Stripe devuelve al comprador.
 *
 * `appUserId` es opcional en su contrato, pero se manda siempre: deja
 * trazabilidad de qué cuenta de la app corresponde a qué pago, que es lo
 * primero que hará falta el día que alguien reclame.
 *
 * Un token ya canjeado **no es un error**: devuelve los mismos datos con
 * `alreadyRedeemed`. El contrato lo subraya —«Déjalo entrar»— porque el usuario
 * puede recargar la página o volver a abrir el enlace del correo.
 */
export async function canjearToken(
  token: string,
  appUserId: string,
): Promise<ResultadoCanje> {
  let respuesta: Response

  try {
    respuesta = await pedir('/api/access/redeem', {
      method: 'POST',
      body: JSON.stringify({ token, appUserId }),
    })
  } catch (error) {
    // Incluye la falta de configuración: sin URL ni secreto no hay a quién preguntar.
    console.error('[landing] no se pudo canjear el token', error)
    return { ok: false, fallo: { motivo: 'sin-configurar' } }
  }

  if (respuesta.ok) {
    const datos = canjeSchema.safeParse(await respuesta.json())

    if (!datos.success) {
      console.error('[landing] respuesta de canje inesperada', datos.error.issues)
      return { ok: false, fallo: { motivo: 'error' } }
    }

    return { ok: true, acceso: datos.data }
  }

  if (respuesta.status === 404) return { ok: false, fallo: { motivo: 'no-encontrado' } }

  if (respuesta.status === 410) {
    // El correo viene en el 410 para poder prerrellenar la página de reenvío.
    const cuerpo = await respuesta.json().catch(() => null)
    const email = z.object({ email: z.string() }).safeParse(cuerpo)
    return { ok: false, fallo: { motivo: 'caducado', email: email.success ? email.data.email : null } }
  }

  /*
   * 401 (secreto incorrecto) y 503 (a su backend le falta el secreto) son
   * problemas de configuración entre los dos equipos, no del usuario. Se
   * registran con detalle porque desde fuera se ven idénticos a un fallo
   * cualquiera, y se tratan como «no configurado».
   */
  console.error('[landing] canje rechazado', {
    status: respuesta.status,
    cuerpo: await respuesta.text().catch(() => ''),
  })

  return {
    ok: false,
    fallo: { motivo: respuesta.status === 401 || respuesta.status === 503 ? 'sin-configurar' : 'error' },
  }
}

/**
 * Estado de acceso de un correo.
 *
 * Devuelve `null` si no se pudo preguntar. Quien llame **no debe** interpretar
 * eso como «no tiene acceso»: el contrato pide que una caída de su backend no
 * eche de la app a quien ya estaba validado.
 */
export async function consultarEstado(email: string): Promise<AccesoLanding | null> {
  try {
    const respuesta = await pedir(
      `/api/access/status?email=${encodeURIComponent(email)}`,
      { method: 'GET' },
    )

    if (!respuesta.ok) {
      console.error('[landing] consulta de estado rechazada', respuesta.status)
      return null
    }

    const datos = accesoSchema.safeParse(await respuesta.json())

    if (!datos.success) {
      console.error('[landing] respuesta de estado inesperada', datos.error.issues)
      return null
    }

    return datos.data
  } catch (error) {
    console.error('[landing] no se pudo consultar el estado', error)
    return null
  }
}

/**
 * Portal de facturación de Stripe: cancelar, cambiar tarjeta y ver facturas.
 *
 * Lo abre su backend, no el nuestro. Es lo que cumple la promesa de «cancela en
 * dos clics» sin construir ni una sola de esas pantallas — y por eso esta app
 * no necesita ninguna clave de Stripe.
 *
 * Este endpoint es público en su lado y no lleva el secreto compartido.
 */
export async function urlDelPortalDeFacturacion(email: string): Promise<string | null> {
  try {
    const respuesta = await fetch(`${baseUrl()}/api/stripe/portal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
      cache: 'no-store',
    })

    if (!respuesta.ok) {
      console.error('[landing] no se pudo abrir el portal', respuesta.status)
      return null
    }

    const datos = z.object({ url: z.url() }).safeParse(await respuesta.json())
    return datos.success ? datos.data.url : null
  } catch (error) {
    console.error('[landing] no se pudo abrir el portal', error)
    return null
  }
}
