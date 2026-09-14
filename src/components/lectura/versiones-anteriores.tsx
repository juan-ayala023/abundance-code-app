import { Archive } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Insignia, Tarjeta } from '@/components/layout/tarjeta'
import { idiomaActual } from '@/i18n/idioma'
import { SECCIONES_LECTURA, SECCIONES_RETRATO } from '@/lib/lectura/schemas'
import type { Database } from '@/lib/supabase/database.types'
import { fechaDeCalendario, fechaDeInstante, horaDeReloj } from '@/lib/time/formato'

type Version = Database['public']['Tables']['reading_versions']['Row']

/**
 * Las lecturas retiradas al corregir el nacimiento, para releerlas.
 *
 * Es la otra mitad de la promesa de Mi Cuenta: se pueden corregir los datos
 * **y** lo que ya se leyó no desaparece. Cada versión dice sobre qué nacimiento
 * se escribió, porque esa es la razón de que se retirara: describe a alguien
 * nacido en otra fecha, otra hora u otro sitio.
 *
 * No se pinta nada si no hay versiones: la mayoría de la gente no corrige
 * nunca sus datos, y una sección vacía diría «aquí falta algo».
 *
 * Se lee con el cliente del usuario: la política RLS le concede `select`
 * sobre sus propias versiones.
 */
export async function VersionesAnteriores({
  versiones,
  kind,
}: {
  versiones: Version[]
  kind: 'lectura' | 'retrato'
}) {
  if (versiones.length === 0) return null

  const t = await getTranslations('versiones')
  const tSecciones = await getTranslations(kind === 'lectura' ? 'lectura.secciones' : 'retrato.titulos')
  const idioma = await idiomaActual()

  const claves =
    kind === 'lectura'
      ? ['resumen', ...SECCIONES_LECTURA.map((seccion) => seccion.clave)]
      : ['apertura', ...SECCIONES_RETRATO.map((seccion) => seccion.clave)]

  return (
    <Tarjeta className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Insignia Icono={Archive} />
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-light">{t(`titulo.${kind}`)}</h2>
          <p className="text-sm text-tinta-suave">{t('nota')}</p>
        </div>
      </div>

      <ul className="flex flex-col divide-y divide-borde">
        {versiones.map((version) => {
          const contenido =
            version.content && typeof version.content === 'object' && !Array.isArray(version.content)
              ? (version.content as Record<string, unknown>)
              : {}

          const nacimiento = [
            fechaDeCalendario(version.birth_date, idioma),
            version.time_unknown ? t('sinHora') : horaDeReloj(version.birth_time),
            [version.birth_city, version.birth_country].filter(Boolean).join(', '),
          ]
            .filter((parte) => parte && parte !== '—')
            .join(' · ')

          return (
            <li key={version.id} className="py-3 first:pt-0 last:pb-0">
              <details className="group">
                <summary className="flex cursor-pointer list-none flex-col gap-1 rounded-xl px-2 py-2 transition-colors hover:bg-fondo-hondo/60">
                  <span className="text-[0.65rem] uppercase tracking-[0.18em] text-tinta-tenue">
                    {t('retirada', { fecha: fechaDeInstante(version.archived_at, idioma) })}
                  </span>
                  <span className="text-sm leading-relaxed">
                    {t('escritaCon', { nacimiento })}
                  </span>
                </summary>

                <div className="mt-2 flex flex-col gap-4 rounded-2xl border border-borde bg-oro-palido/40 px-5 py-4">
                  {claves.map((clave) => {
                    const texto = contenido[clave]
                    if (typeof texto !== 'string' || !texto.trim()) return null

                    const titulo =
                      clave === 'resumen' || clave === 'apertura'
                        ? t(clave)
                        : tSecciones(clave as never)

                    return (
                      <section key={clave} className="flex flex-col gap-1">
                        <h3 className="text-sm font-medium">{titulo}</h3>
                        <p className="text-sm leading-relaxed text-tinta-suave">{texto}</p>
                      </section>
                    )
                  })}
                </div>
              </details>
            </li>
          )
        })}
      </ul>
    </Tarjeta>
  )
}
