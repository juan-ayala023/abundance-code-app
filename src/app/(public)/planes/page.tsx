import type { Metadata } from 'next'
import Link from 'next/link'

import { Logo } from '@/components/layout/logo'
import { getPublicEnv } from '@/lib/env/public'

export const metadata: Metadata = {
  title: 'Planes · Abundance Code',
}

/**
 * Puente a la landing externa (CLAUDE.md §5).
 *
 * Esta app no cobra: la compra ocurre fuera. Esta pantalla solo existe para no
 * dejar sin destino a quien llegue buscando comprar, y para que el enlace a la
 * landing salga siempre de la variable de entorno y no de un dominio escrito a
 * mano en el código.
 */
export default function PlanesPage() {
  const landingUrl = getPublicEnv().NEXT_PUBLIC_LANDING_URL

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-8 px-6 text-center">
      <Logo size={96} />

      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-light tracking-tight">Planes</h1>
        <p className="text-tinta-suave">
          La compra se realiza en nuestra web principal. Al terminar, vuelve
          aquí y entra con la cuenta de Google del correo que hayas usado.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        <a
          href={landingUrl}
          className="rounded-xl bg-oro px-6 py-3 font-medium text-white transition-colors hover:bg-oro-hondo"
        >
          Ir a comprar →
        </a>
        <Link
          href="/activar"
          className="rounded-xl border border-borde bg-superficie px-6 py-3 font-medium transition-colors hover:bg-fondo-hondo"
        >
          Ya compré
        </Link>
      </div>
    </main>
  )
}
