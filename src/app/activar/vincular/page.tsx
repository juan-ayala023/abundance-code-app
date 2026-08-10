import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { resolveAccess } from '@/lib/access/entitlement'
import { getTranslations } from 'next-intl/server'

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
  const t = await getTranslations('vincular')

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          {esCaducado
            ? t('tituloCaducado')
            : esInactivo
              ? t('tituloInactivo')
              : t('tituloSinCompra')}
        </h1>
        <p className="opacity-80">
          {esCaducado
            ? t('textoCaducado')
            : esInactivo
              ? t('textoInactivo')
              : t('textoSinCompra')}
        </p>
        <p className="rounded-xl border border-borde bg-superficie px-4 py-3 font-mono text-sm">
          {access.email}
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">
          {t('quePuedesHacer')}
        </h2>

        <p className="text-sm opacity-80">
          {t('otroCorreo')}
        </p>

        <form action={cerrarSesion}>
          <button
            type="submit"
            className="w-full rounded-xl border border-borde bg-superficie px-5 py-3 font-medium transition-colors hover:bg-fondo-hondo"
          >
            {t('otraCuenta')}
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
            ? t('pedirEnlace')
            : esInactivo
              ? t('renovar')
              : t('comprar')}
        </a>
      </section>

      <p className="text-sm opacity-70">
        {t('soporte')}
      </p>
    </main>
  )
}
