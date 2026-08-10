import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { resolveAccess } from '@/lib/access/entitlement'
import { getPublicEnv } from '@/lib/env/public'
import { urlDeReenvio } from '@/lib/access/landing'

import { cerrarSesion } from './actions'

export const metadata: Metadata = {
  title: 'Vincula tu compra · Abundance Code',
}

/**
 * Pantalla para quien entró con Google pero no tiene acceso.
 *
 * La regla es no dejar nunca un callejón sin salida (CLAUDE.md §3.5): siempre
 * hay al menos una acción posible desde aquí.
 */
export default async function VincularPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const access = await resolveAccess()

  if (access.kind === 'anonimo') redirect('/activar')
  if (access.kind === 'concedido') redirect('/portal')

  const params = await searchParams
  const landingUrl = getPublicEnv().NEXT_PUBLIC_LANDING_URL
  const esInactivo = access.kind === 'inactivo' || params.estado === 'inactivo'
  /*
   * Llegó con un enlace de acceso caducado. No es lo mismo que «no encontramos
   * tu compra»: esta persona SÍ compró, y tiene arreglo en un clic. Sin
   * distinguirlo, se le decía que no constaba su compra y se quedaba sin
   * camino, que es el peor sitio donde dejar a alguien que ha pagado.
   */
  const esCaducado = params.estado === 'caducado'

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          {esCaducado
            ? 'Tu enlace de acceso caducó'
            : esInactivo
              ? 'Tu acceso no está activo'
              : 'No encontramos tu compra'}
        </h1>
        <p className="opacity-80">
          {esCaducado
            ? 'Los enlaces de acceso valen 30 días. Pide uno nuevo y entras enseguida: tu compra sigue ahí.'
            : esInactivo
              ? 'Encontramos tu compra, pero la suscripción no está activa ahora mismo.'
              : 'No hay ninguna compra registrada con este correo:'}
        </p>
        <p className="rounded-xl border border-borde bg-superficie px-4 py-3 font-mono text-sm">
          {access.email}
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">
          Qué puedes hacer
        </h2>

        <p className="text-sm opacity-80">
          Si compraste con otro correo, entra con la cuenta de Google que
          corresponda a ese correo.
        </p>

        <form action={cerrarSesion}>
          <button
            type="submit"
            className="w-full rounded-xl border border-borde bg-superficie px-5 py-3 font-medium transition-colors hover:bg-fondo-hondo"
          >
            Probar con otra cuenta
          </button>
        </form>

        {/*
          Con el enlace caducado la acción principal es pedir otro, no comprar:
          esta persona ya pagó. Mandarla a la página de compra sería ofrecerle
          pagar dos veces por lo mismo.
        */}
        <a
          href={esCaducado ? urlDeReenvio() : landingUrl}
          className="w-full rounded-xl bg-oro px-5 py-3 text-center font-medium text-white transition-colors hover:bg-oro-hondo"
        >
          {esCaducado
            ? 'Pedir un enlace nuevo'
            : esInactivo
              ? 'Renovar mi acceso'
              : 'Comprar mi acceso'}
        </a>
      </section>

      <p className="text-sm opacity-70">
        ¿Compraste y sigues viendo esto? Escríbenos con el correo que usaste al
        pagar y lo vinculamos a mano.
      </p>
    </main>
  )
}
