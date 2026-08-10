import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { CartaDescargable } from '@/components/chart/boton-descargar'
import { NatalChart } from '@/components/chart/natal-chart'
import { TablaPosiciones } from '@/components/chart/tabla-posiciones'
import { Contenedor } from '@/components/layout/contenedor'
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
  const t = await getTranslations('lectura')
  const tNav = await getTranslations('nav')

  return (
    <Contenedor>
      <EncabezadoPagina
        titulo={t('titulo')}
        descripcion={t('descripcion')}
        volver={{ href: '/portal', texto: tNav('volverAlPortal') }}
      />

      <Tarjeta className="flex flex-col gap-6 p-8">
        {carta ? (
          /*
            Rueda y tabla en paralelo a partir de `xl`. Apiladas dejaban medio
            ancho vacío en pantallas grandes y obligaban a bajar para relacionar
            un planeta del dibujo con su fila. Por debajo de `xl` se apilan, que
            es lo único legible en una columna estrecha.
          */
          <CartaDescargable
            nombreArchivo={`carta-natal-${portal.birth_date}`}
            cabecera={<DatosDeNacimiento portal={portal} />}
          >
            <div className="grid items-start gap-10 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
              <NatalChart carta={carta} />
              <TablaPosiciones carta={carta} />
            </div>
          </CartaDescargable>
        ) : (
          <>
            <DatosDeNacimiento portal={portal} />
            <AvisoPendiente>
              {t('cartaPendiente')}
            </AvisoPendiente>
          </>
        )}
      </Tarjeta>

      {lectura.success ? (
        <>
          <Tarjeta className="bg-oro-palido/40">
            <p className="text-[0.65rem] uppercase tracking-[0.18em] text-tinta-tenue">
              {t('enEstaLectura')}
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {SECCIONES_LECTURA.map(({ clave }) => (
                <li
                  key={clave}
                  className="rounded-full border border-borde bg-superficie px-3 py-1.5 text-xs text-tinta-suave"
                >
                  {t(`secciones.${clave}` as never)}
                </li>
              ))}
            </ul>
          </Tarjeta>

          <Tarjeta className="bg-oro-palido/40">
            <h2 className="flex items-center gap-3 text-2xl font-light">
              <Estrella />
              {t('resumen')}
            </h2>
            {/* `max-w-prose`: el resumen es prosa suelta y a 1280 px daría
                líneas de 180 caracteres. */}
            <p className="mt-4 max-w-prose text-lg leading-relaxed text-tinta-suave">
              {lectura.data.resumen}
            </p>
          </Tarjeta>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {SECCIONES_LECTURA.map(({ clave }) => (
              <Tarjeta key={clave} className="flex flex-col gap-3">
                <h3 className="flex items-center gap-3 text-xl font-light">
                  <Estrella />
                  {t(`secciones.${clave}` as never)}
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
            {t('noGenerada')}
          </AvisoPendiente>

          <ul className="grid gap-3 md:grid-cols-2">
            {SECCIONES_LECTURA.map(({ clave }) => (
              <li
                key={clave}
                className="flex items-center gap-2 rounded-2xl border border-dashed border-borde-fuerte px-4 py-3 text-sm text-tinta-suave"
              >
                <Estrella className="text-oro-claro" />
                {t(`secciones.${clave}` as never)}
              </li>
            ))}
          </ul>
        </>
      )}
    </Contenedor>
  )
}

/** Nombre, fecha, hora y lugar: la cabecera de la tarjeta de la carta. */
function DatosDeNacimiento({
  portal,
}: {
  portal: { full_name: string | null; birth_date: string | null; birth_time: string | null; birth_city: string | null }
}) {
  return (
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
  )
}
