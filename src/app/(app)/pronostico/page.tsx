import { CalendarDays, Eye, Sparkles, Target } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { idiomaActual, type Idioma } from '@/i18n/idioma'
import { AvisoIdioma } from '@/components/lectura/aviso-idioma'
import { PronosticoGeneracion } from '@/components/lectura/pronostico-generacion'
import { Contenedor } from '@/components/layout/contenedor'
import { EncabezadoPagina } from '@/components/layout/encabezado-pagina'
import { RequiereSuscripcion } from '@/components/layout/requiere-suscripcion'
import { Insignia, Tarjeta } from '@/components/layout/tarjeta'
import { entitlementDe, resolveAccess } from '@/lib/access/entitlement'
import { nivelDeAcceso } from '@/lib/access/nivel'
import { pronosticoEnIdioma, pronosticoGuardado } from '@/lib/lectura/pronostico'
import type { PronosticoTexto } from '@/lib/lectura/schemas'
import { createClient } from '@/lib/supabase/server'

import { traducirPronosticoActual } from './actions'

export const metadata: Metadata = {
  title: 'Tu pronóstico · Abundance Code',
}

/**
 * Escribir el pronóstico son 31 cálculos del cielo y un texto largo: entre dos
 * y tres minutos. La acción que lo hace vive en esta ruta, así que es aquí
 * donde se declara el tiempo máximo.
 */
export const maxDuration = 300

/**
 * El pronóstico del periodo.
 *
 * A diferencia de la activación diaria, aquí **no se genera durante el
 * render**: calcular el calendario (31 posiciones del cielo) y escribir cinco
 * ventanas tarda más de lo que una página debe tardar en responder. Se pide
 * desde el cliente, con progreso y reintento, igual que el retrato.
 */
export default async function PronosticoPage() {
  const supabase = await createClient()

  const { data: portal } = await supabase
    .from('portals')
    .select('id, chart, birth_date')
    .maybeSingle()

  if (!portal?.birth_date) redirect('/onboarding')

  const t = await getTranslations('pronostico')
  const tNav = await getTranslations('nav')
  const idioma = await idiomaActual()

  const acceso = await resolveAccess()
  const nivel = nivelDeAcceso(entitlementDe(acceso))

  const guardado = nivel === 'completo' ? await pronosticoGuardado(supabase, portal.id) : null
  const version = guardado ? pronosticoEnIdioma(guardado.contenido, idioma) : null

  return (
    <Contenedor>
      <EncabezadoPagina
        titulo={t('titulo')}
        descripcion={
          guardado
            ? `${t('descripcion')} · ${periodoLegible(guardado.desde, guardado.hasta, idioma)}`
            : t('descripcion')
        }
        volver={{ href: '/portal', texto: tNav('volverAlPortal') }}
      />

      {nivel === 'solo-lectura' ? (
        <RequiereSuscripcion seccion={t('seccion')} />
      ) : !guardado ? (
        /* Sin pronóstico vigente: se escribe a petición. */
        <PronosticoGeneracion tieneCarta={Boolean(portal.chart)} />
      ) : (
        <>
          {!version ? (
            <AvisoIdioma
              escritoEn={guardado.contenido.idioma ?? 'es'}
              actual={idioma}
              traducir={traducirPronosticoActual}
            />
          ) : null}

          <Contenido texto={version?.texto ?? guardado.contenido} idioma={idioma} t={t} />
        </>
      )}
    </Contenedor>
  )
}

function Contenido({
  texto,
  idioma,
  t,
}: {
  texto: PronosticoTexto
  idioma: Idioma
  t: Awaited<ReturnType<typeof getTranslations<'pronostico'>>>
}) {
  return (
    <>
      <Tarjeta className="bg-oro-palido/40">
        <h2 className="flex items-center gap-3 text-2xl font-light">
          <Sparkles size={20} className="text-oro" aria-hidden="true" />
          {t('apertura')}
        </h2>
        <p className="mt-4 max-w-prose text-base leading-relaxed text-tinta-suave">{texto.apertura}</p>
      </Tarjeta>

      {/* Las ventanas, en orden de calendario. La fecha manda sobre el texto:
          sale del cálculo, no del modelo. */}
      <div className="flex flex-col gap-6">
        {texto.ventanas.map((ventana) => (
          <Tarjeta key={ventana.id} className="flex flex-col gap-4">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.18em] text-tinta-tenue">
                  <CalendarDays size={14} aria-hidden="true" />
                  {rangoLegible(ventana.desde, ventana.hasta, idioma)}
                </p>
                <h3 className="text-xl font-light">{ventana.titulo}</h3>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                  ventana.nivel === 'alta'
                    ? 'bg-oro text-white'
                    : ventana.nivel === 'media'
                      ? 'bg-oro-palido text-tinta'
                      : 'border border-borde text-tinta-suave'
                }`}
              >
                {t(`nivel.${ventana.nivel}` as never)}
              </span>
            </header>

            <p className="text-sm leading-relaxed text-tinta-tenue">{ventana.configuracion}</p>

            <div className="flex gap-4">
              <Insignia Icono={Target} />
              <div className="min-w-0">
                <h4 className="text-sm font-medium">{t('area')}</h4>
                <p className="mt-1 leading-relaxed text-tinta-suave">{ventana.area}</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium">{t('manifestaciones')}</h4>
              <ol className="mt-2 flex flex-col gap-2">
                {ventana.manifestaciones.map((manifestacion, i) => (
                  <li key={i} className="flex gap-3 leading-relaxed text-tinta-suave">
                    <span className="mt-0.5 shrink-0 text-xs text-oro-hondo">{i + 1}</span>
                    <span>{manifestacion}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex gap-4 rounded-2xl bg-fondo-hondo px-4 py-3">
              <Insignia Icono={Eye} />
              <div className="min-w-0">
                <h4 className="text-sm font-medium">{t('queObservar')}</h4>
                <p className="mt-1 leading-relaxed text-tinta-suave">{ventana.queObservar}</p>
              </div>
            </div>
          </Tarjeta>
        ))}
      </div>

      {texto.secundarias.length > 0 ? (
        <Tarjeta className="flex flex-col gap-3">
          <h2 className="text-lg font-light">{t('secundarias')}</h2>
          <ul className="flex flex-col gap-2">
            {texto.secundarias.map((linea, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-tinta-suave">
                <span className="text-oro-claro" aria-hidden="true">·</span>
                <span>{linea}</span>
              </li>
            ))}
          </ul>
        </Tarjeta>
      ) : null}

      <Tarjeta className="bg-oro-palido/40">
        <h2 className="text-lg font-light">{t('cierre')}</h2>
        <p className="mt-3 max-w-prose leading-relaxed text-tinta-suave">{texto.cierre}</p>
      </Tarjeta>

      <p className="text-center text-xs leading-relaxed text-tinta-tenue">{t('aviso')}</p>
    </>
  )
}

/** «del 22 de septiembre al 22 de octubre». Las fechas son de calendario. */
function periodoLegible(desde: string, hasta: string, idioma: Idioma): string {
  return rangoLegible(desde, hasta, idioma)
}

function rangoLegible(desde: string, hasta: string, idioma: Idioma): string {
  const formato = (iso: string, conAnio: boolean) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(idioma, {
      day: 'numeric',
      month: 'long',
      ...(conAnio ? { year: 'numeric' } : {}),
      timeZone: 'UTC',
    })

  const mismoAnio = desde.slice(0, 4) === hasta.slice(0, 4)
  return `${formato(desde, !mismoAnio)} – ${formato(hasta, true)}`
}
