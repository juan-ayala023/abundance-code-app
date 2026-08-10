import { Compass, GitBranch, MessageCircle, Sparkles, Sun } from 'lucide-react'
import type { Metadata } from 'next'

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

  return (
    <Contenedor>
      <div className="flex items-start justify-between gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-4xl font-light tracking-tight lg:text-5xl">
            Bienvenido a tu Portal{nombre ? `, ${nombre}` : ''}
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
              Tu portal incluye {ciclo.total} días de guía activa. Después, tu
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
          titulo="Tu Código Natal"
          descripcion="Tu mapa energético único revela tu esencia, talentos naturales y camino de vida."
          href={tieneDatos ? '/carta' : undefined}
          accion={tieneDatos ? 'Ver lectura completa' : undefined}
          pendiente={
            tieneDatos ? undefined : 'Disponible cuando completes tus datos de nacimiento.'
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
          titulo="Tu Patrón Central"
          descripcion={lectura.success ? lectura.data.resumen : undefined}
          recorte
          href={lectura.success ? '/lectura-base' : undefined}
          accion={lectura.success ? 'Ver lectura completa' : undefined}
          pendiente={
            lectura.success
              ? undefined
              : tieneDatos
                ? 'Se está preparando desde tu Código Natal.'
                : 'Disponible cuando completes tus datos de nacimiento.'
          }
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <TarjetaAccion
          Icono={Sun}
          sobretitulo="Activación de hoy"
          titulo={ciclo ? `Activación del Día ${ciclo.dia}` : 'Activación de Hoy'}
          descripcion="Una activación energética diaria para elevar tu frecuencia y alinear tus acciones."
          href={tieneDatos ? '/activacion' : undefined}
          accion={tieneDatos ? 'Leer activación completa' : undefined}
          pendiente={tieneDatos ? undefined : 'Disponible tras completar tus datos.'}
        />

        <TarjetaAccion
          Icono={MessageCircle}
          titulo="Guía Personalizada"
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
    </Contenedor>
  )
}
