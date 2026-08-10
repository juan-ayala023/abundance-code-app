import { BookOpen, Check, DoorOpen, Lock, Route, Sun } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { Insignia, Tarjeta } from '@/components/layout/tarjeta'
import { Generacion } from '@/components/lectura/generacion'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Preparando tu lectura · Abundance Code',
}

/**
 * El límite de tiempo de la función, en segundos.
 *
 * **Esto decide si el producto funciona en producción.** La acción
 * `generarLectura()` se ejecuta dentro de esta ruta y tarda unos 73 segundos
 * medidos. Una función serverless corta por defecto **mucho antes**: en Vercel
 * son 15 s si no se dice otra cosa. Sin esta línea, la lectura base —el
 * entregable por el que paga el cliente— se corta a mitad, siempre, y el
 * usuario ve «no hemos podido preparar tu lectura».
 *
 * No lo detecta ninguna prueba: en local `next start` no impone límite, así que
 * los 208 tests pasan en verde con este fallo dentro. Solo aparece desplegado.
 *
 * 300 s es el techo del plan Pro de Vercel. **El plan Hobby no llega**: su
 * máximo absoluto son 60 s, por debajo de los 73 que esto necesita. Si el
 * despliegue va a Hobby, la generación hay que sacarla a un trabajo en segundo
 * plano con sondeo desde la pantalla, que es bastante más trabajo.
 */
export const maxDuration = 300

/** Solo los iconos: los textos viven en los diccionarios. */
const PASOS = [
  { clave: 'carta', Icono: Sun },
  { clave: 'patrones', Icono: Route },
  { clave: 'bloqueos', Icono: Lock },
  { clave: 'guia', Icono: BookOpen },
  { clave: 'portal', Icono: DoorOpen },
] as const

/**
 * Pantalla de espera mientras se genera la lectura.
 *
 * De momento es estática: no hay nada que generar todavía. Cuando exista la
 * capa de IA, el progreso vendrá del estado real del trabajo — nunca de un
 * temporizador que simule avance, que es la forma habitual de que una barra
 * llegue al 99 % y se quede ahí.
 */
export default async function GenerandoPage() {
  const supabase = await createClient()

  const { data: portal } = await supabase
    .from('portals')
    .select('birth_date, chart, base_reading')
    .maybeSingle()

  if (!portal?.birth_date) redirect('/onboarding')
  if (portal.base_reading) redirect('/lectura-base')

  /*
   * El progreso sale del estado real, no de un temporizador. El primer paso
   * está hecho de verdad —la carta se calcula al terminar el onboarding— y los
   * cuatro restantes dependen de la capa de interpretación, que no está
   * conectada. Simular avance es justo lo que hace que una barra llegue al 99 %
   * y se quede ahí para siempre.
   */
  const completados = portal.chart ? 1 : 0
  const progreso = Math.round((completados / PASOS.length) * 100)
  const t = await getTranslations('generando')

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-10 px-6 py-12">
      <header className="flex flex-col gap-3 text-center">
        <h1 className="text-4xl font-light leading-tight tracking-tight">
          {t('cabecera1')}{' '}
          <span className="italic text-oro-hondo">{t('cabecera2')}</span>
        </h1>
        <p className="text-tinta-suave">
          {t('cabeceraTexto')}
        </p>
      </header>

      <Tarjeta className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-tinta-suave">
              {t('paso', { n: Math.min(completados + 1, PASOS.length), total: PASOS.length })}
            </span>
            <span className="text-tinta-tenue">{progreso} %</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progreso}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('progresoLabel')}
            className="h-2 overflow-hidden rounded-full bg-oro-palido"
          >
            {/* Sin transición: el ancho refleja un estado guardado, no una
                animación que sugiera un avance que no está ocurriendo. */}
            <div className="h-full rounded-full bg-oro" style={{ width: `${progreso}%` }} />
          </div>
        </div>

        <ol className="flex flex-col gap-5">
          {PASOS.map(({ clave, Icono }, indice) => {
            const hecho = indice < completados

            return (
              <li key={indice} className="flex gap-4">
                <Insignia Icono={hecho ? Check : Icono} />
                <div className="min-w-0">
                  <h2 className={`font-light ${hecho ? '' : 'text-tinta-suave'}`}>
                    {t(`pasos.${clave}.titulo` as never)}
                  </h2>
                  <p className="text-sm text-tinta-suave">{t(`pasos.${clave}.descripcion` as never)}</p>
                </div>
                {hecho && <span className="sr-only">{t('completado')}</span>}
              </li>
            )
          })}
        </ol>
      </Tarjeta>

      <Generacion pasosTotales={PASOS.length} />
    </main>
  )
}
