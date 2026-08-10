import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { FormularioConsulta } from '@/components/guia/formulario-consulta'
import { Contenedor } from '@/components/layout/contenedor'
import { EncabezadoPagina } from '@/components/layout/encabezado-pagina'
import { RequiereSuscripcion } from '@/components/layout/requiere-suscripcion'
import { Tarjeta } from '@/components/layout/tarjeta'
import { entitlementDe, resolveAccess } from '@/lib/access/entitlement'
import { nivelDeAcceso } from '@/lib/access/nivel'
import { CONSULTAS_GUIA_POR_DIA } from '@/lib/lectura/schemas'
import { createClient } from '@/lib/supabase/server'

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

export default async function GuiaPage() {
  const supabase = await createClient()

  const { data: portal } = await supabase
    .from('portals')
    .select('id, birth_date, created_at')
    .maybeSingle()

  if (!portal?.birth_date) redirect('/onboarding')

  // Pasados los 30 días sin suscripción, la guía se cierra. La lectura base no.
  const t = await getTranslations('guia')
  const tForm = await getTranslations('guia_form')
  const tNav = await getTranslations('nav')
  const acceso = await resolveAccess()
  const nivel = nivelDeAcceso(entitlementDe(acceso))

  /*
   * Consultas gastadas hoy. El día se corta a medianoche UTC, igual que el
   * contador del ciclo: si cada uno usara un huso distinto, habría momentos en
   * que el portal dice «día 5» y la guía todavía cuenta las consultas del 4.
   */
  const inicioDelDia = new Date()
  inicioDelDia.setUTCHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('guidance_queries')
    .select('id', { count: 'exact', head: true })
    .eq('portal_id', portal.id)
    .gte('created_at', inicioDelDia.toISOString())

  const usadas = count ?? 0
  const restantes = Math.max(CONSULTAS_GUIA_POR_DIA - usadas, 0)

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
            A veces no necesitas más información. A veces, lo que necesitas es
            claridad. Tu Código Personal tiene respuestas. Haz tu pregunta desde
            la intención y recibe la guía que tu alma está lista para escuchar.
          </p>

          <FormularioConsulta restantes={restantes} />
        </Tarjeta>
      )}

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
