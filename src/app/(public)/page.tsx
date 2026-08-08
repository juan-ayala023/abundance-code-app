import Link from 'next/link'

import { Logo } from '@/components/layout/logo'

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-8 px-6 text-center">
      <Logo size={120} />

      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-light tracking-tight">
          Tu código personal, leído desde el cielo
        </h1>
        <p className="text-tinta-suave">
          Tu carta natal calculada y una interpretación creada para ti, en tu
          portal privado.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        <Link
          href="/activar"
          className="rounded-xl bg-oro px-6 py-3 font-medium text-white transition-colors hover:bg-oro-hondo"
        >
          Ya compré, quiero entrar
        </Link>
        <Link
          href="/planes"
          className="rounded-xl border border-borde bg-superficie px-6 py-3 font-medium transition-colors hover:bg-fondo-hondo"
        >
          Ver planes
        </Link>
      </div>
    </main>
  )
}
