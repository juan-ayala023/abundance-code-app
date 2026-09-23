import { BookOpen, Check, DoorOpen, Route, Sun } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { Insignia, Tarjeta } from '@/components/layout/tarjeta'
import { Generacion } from '@/components/lectura/generacion'
import { createClient } from '@/lib/supabase/server'
import { nombreDePila } from '@/lib/lectura/voz'

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
  { clave: 'interpretando', Icono: Route },
  { clave: 'lectura', Icono: BookOpen },
  { clave: 'portal', Icono: DoorOpen },
] as const

/**
 * Pantalla de espera mientras se genera la lectura.
 *
 * Cuatro pasos y ningún porcentaje. El que había salía de un solo dato —si la
 * carta estaba calculada— así que se quedaba clavado en 20 % hasta que la
 * página cambiaba de golpe: un progreso que no progresa miente sobre lo que
 * está pasando, y la revisión del 23 de septiembre pidió quitarlo. Los pasos sí
 * se marcan, y solo cuando están hechos de verdad.
 */
export default async function GenerandoPage() {
  const supabase = await createClient()

  const { data: portal } = await supabase
    .from('portals')
    .select('birth_date, chart, base_reading, full_name')
    .maybeSingle()

  if (!portal?.birth_date) redirect('/onboarding')
  if (portal.base_reading) redirect('/lectura-base')

  /* El primer paso está hecho cuando hay carta. Lo demás lo cuenta <Generacion />. */
  const completados = portal.chart ? 1 : 0
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
        <p className="text-sm text-tinta-suave">{t('duracion')}</p>

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

      <Generacion pasosTotales={PASOS.length} nombre={nombreDePila(portal.full_name)} />
    </main>
  )
}
