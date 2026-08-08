import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { CartaDescargable } from '@/components/chart/boton-descargar'
import { NatalChart } from '@/components/chart/natal-chart'
import { TablaPosiciones } from '@/components/chart/tabla-posiciones'
import { AvisoPendiente, EncabezadoPagina } from '@/components/layout/encabezado-pagina'
import { Estrella } from '@/components/layout/estrella'
import { Tarjeta } from '@/components/layout/tarjeta'
import { AnalisisCompleto } from '@/components/lectura/analisis-completo'
import type { Carta } from '@/lib/astrology/types'
import { SECCIONES_LECTURA, lecturaBaseSchema } from '@/lib/lectura/schemas'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Tu lectura base · Abundance Code',
}

export default async function LecturaBasePage() {
  const supabase = await createClient()

  const { data: portal } = await supabase
    .from('portals')
    .select('full_name, birth_date, birth_time, birth_city, chart, base_reading')
    .maybeSingle()

  if (!portal?.birth_date) redirect('/onboarding')

  const carta = portal.chart as Carta | null

  // Se valida lo que hay guardado: una lectura a medias no debe pintarse como
  // si estuviera completa.
  const lectura = lecturaBaseSchema.safeParse(portal.base_reading)

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10 lg:px-10">
      <EncabezadoPagina
        titulo="Tu lectura base personalizada"
        descripcion="Una interpretación creada desde tu carta natal para ayudarte a entender tus patrones, bloqueos y áreas de expansión."
        volver={{ href: '/portal', texto: 'Volver a mi portal' }}
      />

      <Tarjeta className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <p className="text-[0.65rem] uppercase tracking-[0.18em] text-tinta-tenue">
            Tu carta natal
          </p>
          <h2 className="text-2xl font-light">{portal.full_name}</h2>
          <p className="text-sm text-tinta-suave">
            {portal.birth_date}
            {portal.birth_time ? ` · ${String(portal.birth_time).slice(0, 5)}` : ''} ·{' '}
            {portal.birth_city}
          </p>
        </div>

        {carta ? (
          <>
            <CartaDescargable nombreArchivo={`carta-natal-${portal.birth_date}`}>
              <NatalChart carta={carta} />
            </CartaDescargable>
            <TablaPosiciones carta={carta} />
          </>
        ) : (
          <AvisoPendiente>
            Tu carta todavía no está calculada. Aparecerá aquí en cuanto
            conectemos el motor de cálculo.
          </AvisoPendiente>
        )}
      </Tarjeta>

      {lectura.success ? (
        <>
          <Tarjeta className="bg-oro-palido/40">
            <p className="text-[0.65rem] uppercase tracking-[0.18em] text-tinta-tenue">
              En esta lectura
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {SECCIONES_LECTURA.map(({ clave, titulo }) => (
                <li
                  key={clave}
                  className="rounded-full border border-borde bg-superficie px-3 py-1.5 text-xs text-tinta-suave"
                >
                  {titulo}
                </li>
              ))}
            </ul>
          </Tarjeta>

          <Tarjeta className="bg-oro-palido/40">
            <h2 className="flex items-center gap-3 text-2xl font-light">
              <Estrella />
              Resumen de tu código personal
            </h2>
            <p className="mt-3 leading-relaxed text-tinta-suave">
              {lectura.data.resumen}
            </p>
          </Tarjeta>

          <div className="grid gap-5 md:grid-cols-2">
            {SECCIONES_LECTURA.map(({ clave, titulo }) => (
              <Tarjeta key={clave} className="flex flex-col gap-3">
                <h3 className="flex items-center gap-3 text-xl font-light">
                  <Estrella />
                  {titulo}
                </h3>
                <p className="text-sm leading-relaxed text-tinta-suave">
                  {lectura.data[clave]}
                </p>
              </Tarjeta>
            ))}
          </div>

          {lectura.data.analisisCompleto ? (
            <AnalisisCompleto texto={lectura.data.analisisCompleto} />
          ) : null}
        </>
      ) : (
        <>
          <AvisoPendiente>
            Tu lectura todavía no está generada. Estas son las secciones que
            incluirá; el texto llegará cuando conectemos la capa de
            interpretación.
          </AvisoPendiente>

          <ul className="grid gap-3 md:grid-cols-2">
            {SECCIONES_LECTURA.map(({ clave, titulo }) => (
              <li
                key={clave}
                className="flex items-center gap-2 rounded-2xl border border-dashed border-borde-fuerte px-4 py-3 text-sm text-tinta-suave"
              >
                <Estrella className="text-oro-claro" />
                {titulo}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  )
}
