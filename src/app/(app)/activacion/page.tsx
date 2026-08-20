import { CircleHelp, Clock, Eye, MinusCircle, Sparkles, Sun } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { ArcoDeLuz } from '@/components/layout/arco'
import { Contenedor } from '@/components/layout/contenedor'
import { AvisoPendiente, EncabezadoPagina } from '@/components/layout/encabezado-pagina'
import { RequiereSuscripcion } from '@/components/layout/requiere-suscripcion'
import { Insignia, Tarjeta } from '@/components/layout/tarjeta'
import { entitlementDe, resolveAccess } from '@/lib/access/entitlement'
import { nivelDeAcceso } from '@/lib/access/nivel'
import { cartaSchema } from '@/lib/astrology/schema'
import { asegurarActivacion } from '@/lib/lectura/activacion'
import { diaDelCiclo } from '@/lib/lectura/ciclo'
import { createClient } from '@/lib/supabase/server'

/**
 * Esta pantalla **genera durante el render**: si hoy no hay activación, la pide
 * al modelo antes de responder. Son unos 13 s medidos, por encima de los 15 s
 * por defecto de una función serverless en cuanto el modelo tarde un poco más
 * de la cuenta. 60 s da margen sin llegar a dejar a nadie esperando de verdad.
 */
export const maxDuration = 60

export const metadata: Metadata = {
  title: 'Activación de hoy · Abundance Code',
}

const BLOQUES = [
  { clave: 'mensajePrincipal', Icono: Sparkles },
  { clave: 'queObservar', Icono: Eye },
  { clave: 'queEvitar', Icono: MinusCircle },
  { clave: 'queActivar', Icono: Sun },
  { clave: 'preguntaReflexion', Icono: CircleHelp },
] as const

export default async function ActivacionPage() {
  const supabase = await createClient()

  const { data: portal } = await supabase
    .from('portals')
    .select('id, full_name, birth_date, created_at, chart')
    .maybeSingle()

  if (!portal?.birth_date) redirect('/onboarding')

  /*
   * La activación es la del día que corresponde, no la última que exista. Con
   * «la más reciente» un portal en el día 5 vería la del 4 si la del 5 aún no
   * se hubiera generado, y parecería la de hoy.
   */
  const ciclo = diaDelCiclo(portal.created_at)
  const carta = cartaSchema.safeParse(portal.chart)

  const t = await getTranslations('activacion')
  const tNav = await getTranslations('nav')
  const acceso = await resolveAccess()
  const nivel = nivelDeAcceso(entitlementDe(acceso))

  /*
   * Se genera al pedirla, una vez por día. Sin carta no hay nada que
   * interpretar: la IA no la calcula.
   *
   * El nivel se comprueba ANTES de generar, no solo al pintar: generar una
   * activación que no se va a mostrar costaría dinero por nada.
   */
  const activacion =
    nivel === 'completo' && ciclo && carta.success
      ? await asegurarActivacion(portal.id, carta.data, ciclo.dia, ciclo.total, portal.full_name)
      : null

  return (
    <Contenedor>
      {/*
        El titular decía «Activación del Día 13», como en el producto original.
        El cliente pidió que el número de día no aparezca en ninguna pantalla, así
        que ahora es siempre «Activación de Hoy».

        El día **sigue existiendo y sigue mandando**: es lo que decide cuál de las
        treinta activaciones toca hoy, y se le pasa a `asegurarActivacion()` unas
        líneas más arriba. Lo que se quitó es enseñarlo, no contarlo.
      */}
      <EncabezadoPagina
        titulo={t('titulo')}
        descripcion={t('descripcion')}
        volver={{ href: '/portal', texto: tNav('volverAlPortal') }}
      />

      {nivel === 'solo-lectura' ? (
        <RequiereSuscripcion seccion={t('seccion')} />
      ) : activacion ? (
        <>
          {/*
            El arco ocupa la columna izquierda a partir de `lg`, como en el
            producto original. Sin él, cinco párrafos cortos dejaban medio ancho
            vacío en pantallas grandes.
          */}
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

          {/*
            Aquí estaba el botón «Marcar como leída». Se retiró a petición del
            cliente; se conserva el aviso de cuándo llega la siguiente, que no
            dice ningún número y evita que la pantalla parezca un final.
          */}
          <p className="flex items-center justify-center gap-2 text-sm text-tinta-tenue">
            <Clock size={14} aria-hidden="true" />
            {t('siguiente')}
          </p>
        </>
      ) : (
        <>
          <AvisoPendiente>
            {carta.success
              ? t('noPreparada')
              : t('sinCarta')}
          </AvisoPendiente>

          <Tarjeta className="flex flex-col divide-y divide-borde">
            {BLOQUES.map(({ clave, Icono }) => (
              <section key={clave} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                <Insignia Icono={Icono} />
                <h2 className="text-lg font-light text-tinta-suave">{t(`bloques.${clave}` as never)}</h2>
              </section>
            ))}
          </Tarjeta>
        </>
      )}
    </Contenedor>
  )
}
