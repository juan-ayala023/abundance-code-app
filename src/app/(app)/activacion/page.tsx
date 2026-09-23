import { Clock, Eye, MinusCircle, Sun } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { idiomaActual } from '@/i18n/idioma'
import { Contenedor } from '@/components/layout/contenedor'
import { EncabezadoPagina } from '@/components/layout/encabezado-pagina'
import { RequiereSuscripcion } from '@/components/layout/requiere-suscripcion'
import { Insignia, Tarjeta } from '@/components/layout/tarjeta'
import { ZonaHoraria } from '@/components/layout/zona-horaria'
import { ActivacionGeneracion } from '@/components/lectura/activacion-generacion'
import { AvisoIdioma } from '@/components/lectura/aviso-idioma'
import { MesContenido } from '@/components/lectura/mes-contenido'
import { MesGeneracion } from '@/components/lectura/mes-generacion'
import { entitlementDe, resolveAccess } from '@/lib/access/entitlement'
import { nivelDeAcceso } from '@/lib/access/nivel'
import { activacionGuardada } from '@/lib/lectura/activacion'
import { diaDelCiclo } from '@/lib/lectura/ciclo'
import { mesEnIdioma, mesGuardado } from '@/lib/lectura/mes'
import { createClient } from '@/lib/supabase/server'
import { zonaDelPortal } from '@/lib/time/dia'

import { traducirMesActual } from './actions'

export const metadata: Metadata = {
  title: 'Activación de hoy · Abundance Code',
}

/**
 * Las dos acciones que se ejecutan en esta ruta llaman al modelo: la lectura
 * de hoy y la del mes. La del mes, además, calcula 31 días de cielo.
 */
export const maxDuration = 300

/** Las dos vistas de la pantalla. La de hoy es la que se abre por defecto. */
const VISTAS = ['hoy', 'mes'] as const
type Vista = (typeof VISTAS)[number]

/**
 * Activación de Hoy: la lectura del mes y la de hoy, en la misma pantalla.
 *
 * El documento del 23 de septiembre de 2026 fija el menú en cinco entradas y
 * pide que la lectura mensual viva dentro de esta página, en dos opciones. Así
 * que `/pronostico` dejó de ser una entrada del menú y es la pestaña de la
 * izquierda; la ruta sigue existiendo y redirige aquí.
 *
 * Las pestañas son **enlaces**, no estado de cliente: cada vista se renderiza
 * en el servidor con sus datos, se puede compartir su dirección y funciona sin
 * JavaScript. El precio es una navegación por cambio de pestaña, que en una
 * página que se lee —no se manipula— no se nota.
 *
 * **No se genera durante el render.** Ni la de hoy ni la del mes: la página
 * carga siempre, y lo que falte se pide aparte con su estado y su botón. Antes
 * de esto, cuando la generación fallaba se pintaba la lista de títulos vacíos
 * como si fuera la lectura.
 */
export default async function ActivacionPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>
}) {
  const supabase = await createClient()

  const { data: portal } = await supabase
    .from('portals')
    .select('id, full_name, birth_date, birth_city, created_at, tz, display_tz, chart')
    .maybeSingle()

  if (!portal?.birth_date) redirect('/onboarding')

  const { vista: vistaPedida } = await searchParams
  const vista: Vista = VISTAS.includes(vistaPedida as Vista) ? (vistaPedida as Vista) : 'hoy'

  const zona = zonaDelPortal(portal)
  const ciclo = diaDelCiclo(portal.created_at, zona)

  const t = await getTranslations('activacion')
  const tNav = await getTranslations('nav')
  const idioma = await idiomaActual()

  const acceso = await resolveAccess()
  const nivel = nivelDeAcceso(entitlementDe(acceso))
  const completo = nivel === 'completo'

  /* Solo se lee. Escribir es cosa de los dos componentes de generación. */
  const activacion =
    completo && ciclo && vista === 'hoy'
      ? await activacionGuardada(portal.id, ciclo.diaReal, idioma)
      : null

  const mes = completo && vista === 'mes' ? await mesGuardado(supabase, portal.id) : null
  const versionDelMes = mes ? mesEnIdioma(mes.contenido, idioma) : null

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
      {/* Registra en qué huso está la persona: de ahí sale la fecha de abajo. */}
      <ZonaHoraria guardada={portal.display_tz} />

      <EncabezadoPagina
        titulo={t('titulo')}
        descripcion={
          vista === 'mes'
            ? mes
              ? `${t('descripcionMes')} · ${periodoLegible(mes.desde, mes.hasta, idioma)}`
              : t('descripcionMes')
            : fechaLegible
              ? `${fechaLegible} · ${t('descripcion')}`
              : t('descripcion')
        }
        volver={{ href: '/portal', texto: tNav('volverAlPortal') }}
      />

      <Pestanas
        activa={vista}
        titulo={t('pestanas')}
        etiquetas={{ hoy: t('pestanaHoy'), mes: t('pestanaMes') }}
      />

      {!completo ? (
        <RequiereSuscripcion seccion={t('seccion')} />
      ) : vista === 'mes' ? (
        !mes ? (
          <MesGeneracion tieneCarta={Boolean(portal.chart)} />
        ) : (
          <>
            {!versionDelMes ? (
              <AvisoIdioma
                escritoEn={mes.contenido.idioma ?? 'es'}
                actual={idioma}
                traducir={traducirMesActual}
              />
            ) : null}
            <MesContenido texto={versionDelMes?.texto ?? mes.contenido} idioma={idioma} />
          </>
        )
      ) : activacion ? (
        <>
          <Tarjeta className="flex flex-col gap-6 p-8">
            <h2 className="max-w-prose text-2xl font-light leading-snug">
              {activacion.contenido.titular}
            </h2>

            <p className="max-w-prose text-lg leading-relaxed text-tinta-suave">
              {activacion.contenido.situacion}
            </p>

            <div className="flex flex-col divide-y divide-borde border-t border-borde">
              <Parte
                Icono={Eye}
                titulo={t('bloques.senal')}
                texto={activacion.contenido.senal}
              />
              <Parte
                Icono={MinusCircle}
                titulo={t('bloques.evita')}
                texto={activacion.contenido.evita}
              />
              <Parte
                Icono={Sun}
                titulo={t('bloques.activa')}
                texto={activacion.contenido.activa}
              />
            </div>
          </Tarjeta>

          {/* La regla del día, dicha: es la hora de donde está la persona. */}
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
 * Las dos opciones de la pantalla.
 *
 * Con `role="tablist"` no: esto son enlaces que navegan, y un lector de
 * pantalla que oye «pestaña» espera que el contenido cambie sin salir de la
 * página. Se anuncia como lo que es —una navegación de dos elementos— y la
 * activa se marca con `aria-current`.
 */
function Pestanas({
  activa,
  titulo,
  etiquetas,
}: {
  activa: Vista
  titulo: string
  etiquetas: Record<Vista, string>
}) {
  return (
    <nav aria-label={titulo} className="flex gap-2 rounded-full bg-fondo-hondo p-1">
      {VISTAS.map((vista) => {
        const seleccionada = vista === activa
        return (
          <Link
            key={vista}
            href={vista === 'hoy' ? '/activacion' : `/activacion?vista=${vista}`}
            aria-current={seleccionada ? 'page' : undefined}
            className={`flex-1 rounded-full px-4 py-2.5 text-center text-sm font-medium transition-colors ${
              seleccionada
                ? 'bg-superficie text-tinta shadow-[0_1px_3px_rgba(60,53,45,0.08)]'
                : 'text-tinta-suave hover:text-tinta'
            }`}
          >
            {etiquetas[vista]}
          </Link>
        )
      })}
    </nav>
  )
}

function Parte({
  Icono,
  titulo,
  texto,
}: {
  Icono: React.ComponentProps<typeof Insignia>['Icono']
  titulo: string
  texto: string
}) {
  return (
    <section className="flex gap-4 py-5">
      <Insignia Icono={Icono} />
      <div className="min-w-0">
        <h3 className="text-sm font-medium uppercase tracking-[0.12em] text-tinta-tenue">
          {titulo}
        </h3>
        <p className="mt-1 leading-relaxed text-tinta-suave">{texto}</p>
      </div>
    </section>
  )
}

/** «del 23 de septiembre al 22 de octubre». */
function periodoLegible(desde: string, hasta: string, idioma: string): string {
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
