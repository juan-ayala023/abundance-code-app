import { Check, CircleHelp, Clock, Eye, MinusCircle, Sparkles, Sun } from 'lucide-react'
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
import { idiomaActual } from '@/i18n/idioma'
import { createClient } from '@/lib/supabase/server'

import { marcarActivacionLeida } from './actions'

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
    .select('id, birth_date, created_at, chart')
    .maybeSingle()

  if (!portal?.birth_date) redirect('/onboarding')

  /*
   * La activación es la del día que corresponde, no la última que exista. Con
   * «la más reciente» un portal en el día 5 vería la del 4 si la del 5 aún no
   * se hubiera generado, y parecería la de hoy.
   */
  const ciclo = diaDelCiclo(portal.created_at)
  const carta = cartaSchema.safeParse(portal.chart)

  const idioma = await idiomaActual()
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
      ? await asegurarActivacion(portal.id, carta.data, ciclo.dia, ciclo.total)
      : null

  return (
    <Contenedor>
      {/* El día va en el titular, como en el producto original. */}
      <EncabezadoPagina
        titulo={ciclo ? t('tituloDia', { dia: ciclo.dia }) : t('titulo')}
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

          <MarcarLeida id={activacion.id} leidaEn={activacion.leidaEn} idioma={idioma} />
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

/**
 * «Marcar como leída».
 *
 * Una vez marcada no se ofrece deshacer: es un gesto de haber terminado la
 * lectura del día, no un interruptor. Se muestra la fecha para que quede claro
 * que quedó registrado.
 */
async function MarcarLeida({
  id,
  leidaEn,
  idioma,
}: {
  id: string
  leidaEn: string | null
  idioma: string
}) {
  const t = await getTranslations('activacion')

  if (leidaEn) {
    return (
      <p
        role="status"
        className="flex items-center justify-center gap-2 text-sm text-tinta-suave"
      >
        <Check aria-hidden="true" className="size-4 text-oro-hondo" />
        {t('marcada', { fecha: formatearFecha(leidaEn, idioma) })}
      </p>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <form action={marcarActivacionLeida}>
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          className="flex items-center gap-2 rounded-xl bg-oro px-8 py-3.5 font-medium text-white transition-colors hover:bg-oro-hondo"
        >
          <Check size={18} aria-hidden="true" />
          {t('marcar')}
        </button>
      </form>

      <p className="flex items-center gap-2 text-sm text-tinta-tenue">
        <Clock size={14} aria-hidden="true" />
        {t('siguiente')}
      </p>
    </div>
  )
}

/** La fecha también se traduce: «10 de agosto» / «10 August». */
function formatearFecha(valor: string, idioma: string): string {
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return '—'

  return fecha.toLocaleDateString(idioma, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
