import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { resolveAccess } from '@/lib/access/entitlement'
import { getPublicEnv } from '@/lib/env/public'

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

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          {esInactivo ? 'Tu acceso no está activo' : 'No encontramos tu compra'}
        </h1>
        <p className="opacity-80">
          {esInactivo
            ? 'Encontramos tu compra, pero la suscripción no está activa ahora mismo.'
            : 'No hay ninguna compra registrada con este correo:'}
        </p>
        <p className="rounded-lg border border-black/10 px-4 py-3 font-mono text-sm dark:border-white/15">
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
            className="w-full rounded-lg border border-black/15 px-5 py-3 font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Probar con otra cuenta
          </button>
        </form>

        <a
          href={landingUrl}
          className="w-full rounded-lg bg-black px-5 py-3 text-center font-medium text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-black"
        >
          {esInactivo ? 'Renovar mi acceso' : 'Comprar mi acceso'}
        </a>
      </section>

      <p className="text-sm opacity-70">
        ¿Compraste y sigues viendo esto? Escríbenos con el correo que usaste al
        pagar y lo vinculamos a mano.
      </p>
    </main>
  )
}
