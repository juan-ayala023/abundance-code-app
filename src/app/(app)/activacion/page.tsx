import { CircleHelp, Clock, Eye, MinusCircle, Sparkles, Sun } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { idiomaActual } from '@/i18n/idioma'
import { ArcoDeLuz } from '@/components/layout/arco'
import { Contenedor } from '@/components/layout/contenedor'
import { EncabezadoPagina } from '@/components/layout/encabezado-pagina'
import { RequiereSuscripcion } from '@/components/layout/requiere-suscripcion'
import { Insignia, Tarjeta } from '@/components/layout/tarjeta'
import { ZonaHoraria } from '@/components/layout/zona-horaria'
import { ActivacionGeneracion } from '@/components/lectura/activacion-generacion'
import { entitlementDe, resolveAccess } from '@/lib/access/entitlement'
import { nivelDeAcceso } from '@/lib/access/nivel'
import { activacionGuardada } from '@/lib/lectura/activacion'
import { diaDelCiclo } from '@/lib/lectura/ciclo'
import { createClient } from '@/lib/supabase/server'
import { zonaDelPortal } from '@/lib/time/dia'

export const metadata: Metadata = {
  title: 'Activación de hoy · Abundance Code',
}

/** La acción que escribe la activación vive en esta ruta. */
export const maxDuration = 60

const BLOQUES = [
  { clave: 'mensajePrincipal', Icono: Sparkles },
  { clave: 'queObservar', Icono: Eye },
  { clave: 'queEvitar', Icono: MinusCircle },
  { clave: 'queActivar', Icono: Sun },
  { clave: 'preguntaReflexion', Icono: CircleHelp },
] as const

/**
 * La activación de hoy.
 *
 * **No genera durante el render** (revisión del 23 sept): la página carga
 * siempre, y si la activación de hoy todavía no está escrita, se pide aparte
 * con su estado y su botón de reintentar. La lista de títulos sin texto que se
 * veía antes al fallar ya no existe: o hay lectura, o hay un mensaje que
 * explica qué pasa.
 */
export default async function ActivacionPage() {
  const supabase = await createClient()

  const { data: portal } = await supabase
    .from('portals')
    .select('id, full_name, birth_date, birth_city, created_at, tz, display_tz, chart')
    .maybeSingle()

  if (!portal?.birth_date) redirect('/onboarding')

  const zona = zonaDelPortal(portal)
  const ciclo = diaDelCiclo(portal.created_at, zona)

  const t = await getTranslations('activacion')
  const tNav = await getTranslations('nav')
  const idioma = await idiomaActual()

  const acceso = await resolveAccess()
  const nivel = nivelDeAcceso(entitlementDe(acceso))

  /* Solo se lee. Escribirla es cosa de <ActivacionGeneracion />. */
  const activacion =
    nivel === 'completo' && ciclo ? await activacionGuardada(portal.id, ciclo.diaReal, idioma) : null

  const fechaLegible = ciclo
    ? new Date(`${ciclo.fecha}T12:00:00Z`).toLocaleDateString(idioma, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : null

  return (
    <Contenedor>
      {/* Registra en qué huso está la persona: de ahí sale la fecha de arriba. */}
      <ZonaHoraria guardada={portal.display_tz} />

      <EncabezadoPagina
        titulo={t('titulo')}
        descripcion={fechaLegible ? `${fechaLegible} · ${t('descripcion')}` : t('descripcion')}
        volver={{ href: '/portal', texto: tNav('volverAlPortal') }}
      />

      {nivel === 'solo-lectura' ? (
        <RequiereSuscripcion seccion={t('seccion')} />
      ) : activacion ? (
        <>
          <Tarjeta className="grid gap-8 p-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
            <ArcoDeLuz className="hidden h-full max-h-80 w-full self-center lg:block" />

            <div className="flex flex-col divide-y divide-borde">
              {BLOQUES.map(({ clave, Icono }) => (
                <section key={clave} className="flex gap-4 py-5 first:pt-0 last:pb-0">
                  <Insignia Icono={Icono} />
                  <div className="min-w-0">
                    <h2 className="text-lg font-light">{t(`bloques.${clave}` as never)}</h2>
                    <p className="mt-1 leading-relaxed text-tinta-suave">
                      {activacion.contenido[clave]}
                    </p>
                  </div>
                </section>
              ))}
            </div>
          </Tarjeta>

          {/* La regla del día, dicha: ahora es la hora de donde está la persona. */}
          <p className="flex items-center justify-center gap-2 text-center text-sm text-tinta-tenue">
            <Clock size={14} aria-hidden="true" className="shrink-0" />
            <span>
              {t('siguiente')} {t('reglaDia', { zona: nombreDeZona(zona, idioma) })}
            </span>
          </p>
        </>
      ) : (
        <ActivacionGeneracion tieneCarta={Boolean(portal.chart)} />
      )}
    </Contenedor>
  )
}

/**
 * «Madrid» en vez de «Europe/Madrid».
 *
 * El identificador IANA es correcto y nadie lo lee así. Se enseña la ciudad,
 * que es lo que la persona reconoce de su propia hora.
 */
function nombreDeZona(zona: string, idioma: string): string {
  const ciudad = zona.split('/').pop()?.replace(/_/g, ' ')
  if (!ciudad) return zona

  try {
    const corta = new Intl.DateTimeFormat(idioma, { timeZone: zona, timeZoneName: 'short' })
      .formatToParts(new Date())
      .find((parte) => parte.type === 'timeZoneName')?.value
    return corta ? `${ciudad} (${corta})` : ciudad
  } catch {
    return ciudad
  }
}
