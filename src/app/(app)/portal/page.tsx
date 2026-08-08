import { Compass, GitBranch, MessageCircle, Sparkles, Sun } from 'lucide-react'
import type { Metadata } from 'next'

import { AreasDesbloqueadas } from '@/components/layout/areas-desbloqueadas'
import { IndicadorCiclo } from '@/components/layout/indicador-ciclo'
import { Insignia, Tarjeta, TarjetaAccion } from '@/components/layout/tarjeta'
import { diaDelCiclo } from '@/lib/lectura/ciclo'
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

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 lg:px-10">
      <div className="flex items-start justify-between gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-4xl font-light tracking-tight lg:text-5xl">
            Bienvenido a tu portal{nombre ? `, ${nombre}` : ''}
          </h1>
          <p className="text-tinta-suave">
            Este es tu espacio privado de lectura, claridad y alineación.
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
          sobretitulo="Primer paso"
          titulo="Completa tus datos de nacimiento"
          descripcion="Sin fecha, hora y lugar no podemos calcular tu carta. Es lo único que necesitamos de ti."
          href="/onboarding"
          accion="Empezar"
        />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        {ciclo ? (
          <Tarjeta className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <Insignia Icono={Sparkles} />
              <div className="min-w-0">
                <p className="text-[0.65rem] uppercase tracking-[0.18em] text-tinta-tenue">
                  Portal activo
                </p>
                <h2 className="text-3xl font-light">
                  Día {ciclo.dia} de {ciclo.total}
                </h2>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-tinta-suave">
              Tu esfera incluye {ciclo.total} días de guía activa. Después, tu
              lectura base seguirá disponible y podrás decidir si deseas
              continuar con guía avanzada.
            </p>

            <div className="mt-auto flex flex-col gap-2">
              <div
                role="progressbar"
                aria-valuenow={ciclo.progreso}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Día ${ciclo.dia} de ${ciclo.total}`}
                className="h-1.5 overflow-hidden rounded-full bg-fondo-hondo"
              >
                <div
                  className="h-full rounded-full bg-oro"
                  style={{ width: `${ciclo.progreso}%` }}
                />
              </div>
              <p className="text-xs text-oro-hondo">{ciclo.progreso}% completado</p>
            </div>
          </Tarjeta>
        ) : null}

        <TarjetaAccion
          Icono={Compass}
          titulo="Tu código natal"
          descripcion="Tu mapa energético único revela tu esencia, talentos naturales y camino de vida."
          href={tieneDatos ? '/carta' : undefined}
          accion={tieneDatos ? 'Ver mi carta' : undefined}
          pendiente={
            tieneDatos ? undefined : 'Disponible cuando completes tus datos de nacimiento.'
          }
        />

        <TarjetaAccion
          Icono={GitBranch}
          titulo="Tu patrón central"
          descripcion="Estás en un ciclo de expansión y claridad. Es un momento ideal para tomar decisiones alineadas con tu propósito."
          pendiente="Se leerá desde tu carta cuando conectemos la interpretación."
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <TarjetaAccion
          Icono={Sun}
          sobretitulo="Activación de hoy"
          titulo={ciclo ? `Activación del día ${ciclo.dia}` : 'Activación de hoy'}
          descripcion="Una activación energética diaria para elevar tu frecuencia y alinear tus acciones."
          href={tieneDatos ? '/activacion' : undefined}
          accion={tieneDatos ? 'Leer activación completa' : undefined}
          pendiente={tieneDatos ? undefined : 'Disponible tras completar tus datos.'}
        />

        <TarjetaAccion
          Icono={MessageCircle}
          titulo="Guía personalizada"
          descripcion="Hazme una pregunta sobre tus decisiones, bloqueos o señales que estás recibiendo."
          href={tieneDatos ? '/guia' : undefined}
          accion={tieneDatos ? 'Hacer una pregunta' : undefined}
          pendiente={tieneDatos ? undefined : 'Disponible tras completar tus datos.'}
        />
      </div>

      <AreasDesbloqueadas />

      <p className="py-4 text-center text-sm italic text-tinta-suave">
        ✦ No se trata de cambiar quién eres, sino de recordar tu código y
        alinearte con él. ✦
      </p>
    </main>
  )
}
