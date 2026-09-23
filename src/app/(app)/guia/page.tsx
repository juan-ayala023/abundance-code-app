import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { FormularioConsulta } from '@/components/guia/formulario-consulta'
import { HistorialConsultas } from '@/components/guia/historial-consultas'
import { Contenedor } from '@/components/layout/contenedor'
import { EncabezadoPagina } from '@/components/layout/encabezado-pagina'
import { RequiereSuscripcion } from '@/components/layout/requiere-suscripcion'
import { Tarjeta } from '@/components/layout/tarjeta'
import { entitlementDe, resolveAccess } from '@/lib/access/entitlement'
import { nivelDeAcceso } from '@/lib/access/nivel'
import { CONSULTAS_GUIA_POR_DIA } from '@/lib/lectura/schemas'
import { AREAS } from '@/lib/astrology/areas'
import { createClient } from '@/lib/supabase/server'
import { inicioDelDia, zonaDelPortal } from '@/lib/time/dia'

/**
 * La acción `consultarGuia()` corre dentro de esta ruta: unos 6 s medidos, que
 * caben en el valor por defecto, pero sin margen si el modelo se atasca. Se
 * declara para que una respuesta lenta salga como respuesta lenta y no como
 * consulta perdida — que además sería una de las tres del día.
 */
export const maxDuration = 60

export const metadata: Metadata = {
  title: 'Guía personalizada · Abundance Code',
}

export default async function GuiaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  /*
   * Se llega aquí desde las cinco áreas del portal, con `?area=relaciones`.
   *
   * Viaja la CLAVE del área y no la pregunta: la pregunta se resuelve aquí,
   * contra la lista cerrada de `AREAS`, así que un enlace manipulado no puede
   * meter texto arbitrario en un campo que acaba en el prompt del modelo. Un
   * área que no exista simplemente no rellena nada.
   */
  const params = await searchParams
  const area = typeof params.area === 'string' ? params.area : null
  const areaValida = AREAS.some((candidata) => candidata.clave === area)

  const supabase = await createClient()

  const { data: portal } = await supabase
    .from('portals')
    .select('id, birth_date, birth_city, created_at, tz')
    .maybeSingle()

  if (!portal?.birth_date) redirect('/onboarding')

  // Pasados los 30 días sin suscripción, la guía se cierra. La lectura base no.
  const t = await getTranslations('guia')
  const tForm = await getTranslations('guia_form')
  const tNav = await getTranslations('nav')
  const tAreas = await getTranslations('areas')
  const acceso = await resolveAccess()
  const nivel = nivelDeAcceso(entitlementDe(acceso))

  /*
   * Consultas gastadas hoy. El día se corta a la misma hora que el ciclo —
   * medianoche en la zona del lugar de nacimiento—: si cada uno usara un huso
   * distinto, habría momentos en que el portal dice «día 5» y la guía todavía
   * cuenta las consultas del 4.
   */
  const desde = inicioDelDia(zonaDelPortal(portal))

  const { count } = await supabase
    .from('guidance_queries')
    .select('id', { count: 'exact', head: true })
    .eq('portal_id', portal.id)
    .gte('created_at', desde.toISOString())

  const usadas = count ?? 0
  const restantes = Math.max(CONSULTAS_GUIA_POR_DIA - usadas, 0)

  /*
   * El historial. Las últimas cincuenta bastan: son 3 al día, así que cubren
   * más de dos semanas, y quien quiera ir más atrás tiene el buscador del
   * navegador. Se piden aunque la guía esté cerrada por falta de suscripción:
   * lo que ya se respondió es suyo y se puede releer.
   */
  const { data: consultas } = await supabase
    .from('guidance_queries')
    .select('id, question, answer, created_at')
    .eq('portal_id', portal.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <Contenedor className="max-w-5xl">
      <EncabezadoPagina
        titulo={t('titulo')}
        descripcion={t('descripcion')}
        volver={{ href: '/portal', texto: tNav('volverAlPortal') }}
      />

      {nivel === 'solo-lectura' ? (
        <RequiereSuscripcion seccion={t('seccion')} />
      ) : (
        <Tarjeta className="flex flex-col gap-8">
          <p className="text-lg italic leading-relaxed text-tinta-suave">
            {t('intro')}
          </p>

          <FormularioConsulta
            restantes={restantes}
            preguntaInicial={
              areaValida ? tAreas(`preguntas.${area}` as never) : undefined
            }
          />
        </Tarjeta>
      )}

      <HistorialConsultas consultas={consultas ?? []} />

      {/*
        El aviso legal viene del producto anterior y no es decorativo: coincide
        con los guardrails de CLAUDE.md §8, que prohíben dar consejo médico,
        legal o financiero.
      */}
      <p className="text-center text-sm text-tinta-tenue">
        {tForm('aviso')}
      </p>
    </Contenedor>
  )
}
