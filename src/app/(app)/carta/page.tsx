import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { NatalChart } from '@/components/chart/natal-chart'
import { TablaPosiciones } from '@/components/chart/tabla-posiciones'
import { CARTA_DE_EJEMPLO } from '@/lib/astrology/ejemplo'
import type { Carta } from '@/lib/astrology/types'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Tu carta natal · Abundance Code',
}

export default async function CartaPage() {
  const supabase = await createClient()

  const { data: portal } = await supabase
    .from('portals')
    .select('chart, birth_date, birth_city, time_unknown')
    .maybeSingle()

  // Sin datos de nacimiento no hay nada que dibujar.
  if (!portal?.birth_date) redirect('/onboarding')

  const carta = portal.chart as Carta | null

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Tu carta natal</h1>
        <p className="text-sm opacity-70">
          {portal.birth_city} · {portal.birth_date}
        </p>
      </header>

      {carta ? (
        <>
          <NatalChart carta={carta} />
          <TablaPosiciones carta={carta} />
        </>
      ) : (
        <PendienteDeCalculo />
      )}
    </main>
  )
}

/**
 * Todavía no hay motor de cálculo, así que se muestra una carta de EJEMPLO.
 *
 * El aviso es deliberadamente difícil de pasar por alto: enseñar posiciones
 * inventadas sin decirlo sería exactamente el tipo de engaño que este producto
 * no se puede permitir.
 */
function PendienteDeCalculo() {
  return (
    <>
      <div
        role="status"
        className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm"
      >
        <strong>Esto no es tu carta.</strong> Es un ejemplo con posiciones
        inventadas, para ver el diseño mientras conectamos el cálculo real. Tus
        datos de nacimiento ya están guardados; tu carta aparecerá aquí en
        cuanto esté listo.
      </div>

      <div className="opacity-90">
        <NatalChart carta={CARTA_DE_EJEMPLO} />
        <div className="mt-8">
          <TablaPosiciones carta={CARTA_DE_EJEMPLO} />
        </div>
      </div>

      <Link href="/portal" className="text-sm underline underline-offset-4">
        Volver al portal
      </Link>
    </>
  )
}
