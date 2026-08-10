import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { NatalChart } from '@/components/chart/natal-chart'
import { TablaPosiciones } from '@/components/chart/tabla-posiciones'
import { Contenedor } from '@/components/layout/contenedor'
import { asegurarCarta, COLUMNAS_CARTA } from '@/lib/astrology/portal'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Tu carta natal · Abundance Code',
}

export default async function CartaPage() {
  const supabase = await createClient()

  const { data: portal } = await supabase
    .from('portals')
    .select(`${COLUMNAS_CARTA}, birth_city`)
    .maybeSingle()

  // Sin datos de nacimiento no hay nada que dibujar.
  if (!portal?.birth_date) redirect('/onboarding')

  // Calcula y guarda la primera vez; después solo lee.
  const carta = await asegurarCarta(supabase, portal)

  return (
    <Contenedor>
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-light leading-tight tracking-tight lg:text-5xl">
          Tu Carta Natal
        </h1>
        <p className="text-sm opacity-70">
          {portal.birth_city} · {portal.birth_date}
        </p>
      </header>

      {carta ? (
        <>
          <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <NatalChart carta={carta} />
            <TablaPosiciones carta={carta} />
          </div>

          {carta.precision === 'partial' && <AvisoSinHora />}
        </>
      ) : (
        <NoSePudoCalcular />
      )}
    </Contenedor>
  )
}

/**
 * Sin hora de nacimiento la carta existe, pero le faltan las casas, el
 * ascendente y el medio cielo. Decirlo aquí evita que se lea como una carta
 * completa a la que le sobra espacio.
 */
function AvisoSinHora() {
  return (
    <p
      role="note"
      className="rounded-2xl border border-oro-claro bg-oro-palido/60 px-4 py-3 text-sm"
    >
      Tu carta se calculó <strong>sin hora de nacimiento</strong>, así que
      muestra las posiciones de los planetas pero no las casas, el ascendente ni
      el medio cielo. Si algún día la averiguas,{' '}
      <Link href="/onboarding" className="underline underline-offset-4">
        puedes añadirla
      </Link>{' '}
      y se recalcula.
    </p>
  )
}

/**
 * El cálculo falló. No se enseña una carta de muestra en su lugar: en un
 * producto cuyo entregable es una interpretación personal, unas posiciones
 * inventadas pueden confundirse con las propias.
 */
function NoSePudoCalcular() {
  return (
    <>
      <div
        role="status"
        className="rounded-2xl border border-oro-claro bg-oro-palido/60 px-4 py-3 text-sm"
      >
        <strong>No hemos podido calcular tu carta.</strong> Suele deberse a que
        la fecha, la hora o el lugar de nacimiento no encajan entre sí. Revísalos
        y volvemos a intentarlo.
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/onboarding"
          className="text-sm underline underline-offset-4"
        >
          Revisar mis datos de nacimiento
        </Link>
        <Link href="/portal" className="text-sm underline underline-offset-4">
          Volver al portal
        </Link>
      </div>
    </>
  )
}
