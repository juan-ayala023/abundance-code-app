import { Compass, GitBranch, MessageCircle, Sparkles, Sun } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { Contenedor } from '@/components/layout/contenedor'
import { AreasDesbloqueadas } from '@/components/layout/areas-desbloqueadas'
import { IndicadorCiclo } from '@/components/layout/indicador-ciclo'
import { Insignia, Tarjeta, TarjetaAccion } from '@/components/layout/tarjeta'
import { diaDelCiclo } from '@/lib/lectura/ciclo'
import { lecturaBaseSchema } from '@/lib/lectura/schemas'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Tu portal · Abundance Code',
}

export default async function PortalPage() {
  const supabase = await createClient()

  const [{ data: perfil }, { data: portal }] = await Promise.all([
    supabase.from('profiles').select('full_name').maybeSingle(),
    supabase
      .from('portals')
      .select('birth_date, chart, base_reading, created_at')
      .maybeSingle(),
  ])

  const nombre = (perfil?.full_name ?? '').split(' ')[0] ?? ''
  const tieneDatos = Boolean(portal?.birth_date)
  const ciclo = diaDelCiclo(portal?.created_at)

  // El resumen de su lectura, no un texto de muestra. Ver la tarjeta de abajo.
  const lectura = lecturaBaseSchema.safeParse(portal?.base_reading)
  const t = await getTranslations('portal')
  const tNav = await getTranslations('nav')

  return (
    <Contenedor>
      <div className="flex items-start justify-between gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-4xl font-light tracking-tight lg:text-5xl">
            {nombre ? t('bienvenidaConNombre', { nombre }) : t('bienvenida')}
          </h1>
          <p className="text-tinta-suave">
            {t('subtitulo')}
          </p>
        </header>

        {ciclo ? (
          <div className="hidden pt-4 lg:block">
            <IndicadorCiclo progreso={ciclo.progreso} />
          </div>
        ) : null}
      </div>

      {!tieneDatos ? (
        <TarjetaAccion
          Icono={Compass}
          sobretitulo={t('primerPaso')}
          titulo={t('completaDatos')}
          descripcion={t('completaDatosTexto')}
          href="/onboarding"
          accion={t('empezar')}
        />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        {ciclo ? (
          <Tarjeta className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <Insignia Icono={Sparkles} />
              <div className="min-w-0">
                <p className="text-[0.65rem] uppercase tracking-[0.18em] text-tinta-tenue">
                  {t('portalActivo')}
                </p>
                <h2 className="text-3xl font-light">
                  {tNav('dia', { dia: ciclo.dia, total: ciclo.total })}
                </h2>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-tinta-suave">
              {t('incluye', { total: ciclo.total })}
            </p>

            <div className="mt-auto flex flex-col gap-2">
              <div
                role="progressbar"
                aria-valuenow={ciclo.progreso}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={tNav('dia', { dia: ciclo.dia, total: ciclo.total })}
                className="h-1.5 overflow-hidden rounded-full bg-fondo-hondo"
              >
                <div
                  className="h-full rounded-full bg-oro"
                  style={{ width: `${ciclo.progreso}%` }}
                />
              </div>
              <p className="text-xs text-oro-hondo">{t('completado', { progreso: ciclo.progreso })}</p>
            </div>
          </Tarjeta>
        ) : null}

        <TarjetaAccion
          Icono={Compass}
          titulo={t('codigoNatal')}
          descripcion={t('codigoNatalTexto')}
          href={tieneDatos ? '/carta' : undefined}
          accion={tieneDatos ? t('verLectura') : undefined}
          pendiente={
            tieneDatos ? undefined : t('trasDatos')
          }
        />

        {/*
          Aquí había un párrafo escrito a mano —«estás en un ciclo de expansión
          y claridad»— igual para todo el mundo. En un producto cuyo entregable
          es una interpretación personal, un texto así puesto junto al resto se
          lee como si fuera la lectura de quien mira. Ahora sale su resumen real
          o se dice que aún no está.
        */}
        <TarjetaAccion
          Icono={GitBranch}
          titulo={t('patronCentral')}
          descripcion={lectura.success ? lectura.data.resumen : undefined}
          recorte
          href={lectura.success ? '/lectura-base' : undefined}
          accion={lectura.success ? t('verLectura') : undefined}
          pendiente={
            lectura.success
              ? undefined
              : tieneDatos
                ? t('preparando')
                : t('trasDatos')
          }
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <TarjetaAccion
          Icono={Sun}
          sobretitulo={t('activacionHoy')}
          titulo={ciclo ? t('activacionDia', { dia: ciclo.dia }) : t('activacionTitulo')}
          descripcion={t('activacionTexto')}
          href={tieneDatos ? '/activacion' : undefined}
          accion={tieneDatos ? t('leerActivacion') : undefined}
          pendiente={tieneDatos ? undefined : t('trasDatosCorto')}
        />

        <TarjetaAccion
          Icono={MessageCircle}
          titulo={t('guia')}
          descripcion={t('guiaTexto')}
          href={tieneDatos ? '/guia' : undefined}
          accion={tieneDatos ? t('hacerPregunta') : undefined}
          pendiente={tieneDatos ? undefined : t('trasDatosCorto')}
        />
      </div>

      <AreasDesbloqueadas />

      <p className="py-4 text-center text-sm italic text-tinta-suave">
        {t('cierre')}
      </p>
    </Contenedor>
  )
}
