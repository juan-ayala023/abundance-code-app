import { Compass, MessageCircle, Sparkles, Sun } from 'lucide-react'
import type { Metadata } from 'next'

import { TarjetaAccion } from '@/components/layout/tarjeta'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Tu portal · Abundance Code',
}

export default async function PortalPage() {
  const supabase = await createClient()

  const [{ data: perfil }, { data: portal }] = await Promise.all([
    supabase.from('profiles').select('full_name').maybeSingle(),
    supabase.from('portals').select('birth_date, chart, base_reading').maybeSingle(),
  ])

  const nombre = (perfil?.full_name ?? '').split(' ')[0] ?? ''
  const tieneDatos = Boolean(portal?.birth_date)

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10 lg:px-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-light tracking-tight">
          Bienvenido a tu portal{nombre ? `, ${nombre}` : ''}
        </h1>
        <p className="text-tinta-suave">
          Este es tu espacio privado de lectura, claridad y alineación.
        </p>
      </header>

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

      <div className="grid gap-5 md:grid-cols-2">
        <TarjetaAccion
          Icono={Compass}
          sobretitulo="Tu código natal"
          titulo="Tu carta natal"
          descripcion="Tu mapa energético único: la posición exacta del cielo en el momento en que naciste."
          href={tieneDatos ? '/carta' : undefined}
          accion={tieneDatos ? 'Ver mi carta' : undefined}
          pendiente={
            tieneDatos ? undefined : 'Disponible cuando completes tus datos de nacimiento.'
          }
        />

        <TarjetaAccion
          Icono={Sparkles}
          sobretitulo="Lectura base"
          titulo="Tu lectura personalizada"
          descripcion="Una interpretación creada desde tu carta para entender tus patrones, bloqueos y áreas de expansión."
          pendiente="En construcción. Llegará cuando conectemos la capa de interpretación."
        />

        <TarjetaAccion
          Icono={Sun}
          sobretitulo="Activación de hoy"
          titulo="Tu señal diaria"
          descripcion="Una señal para observar hoy, leída desde tu carta: qué mirar, qué evitar y qué activar."
          pendiente="En construcción."
        />

        <TarjetaAccion
          Icono={MessageCircle}
          sobretitulo="Guía personalizada"
          titulo="Pregunta a tu guía"
          descripcion="Consulta tu carta cuando necesites claridad sobre una decisión, un bloqueo o una señal."
          pendiente="En construcción."
        />
      </div>

      {/*
        Nada de barras de progreso ni «Día 1 de 30» todavía: ese ciclo existe en
        el producto anterior pero aún no está modelado aquí, y una barra que no
        mide nada es peor que ninguna.
      */}
    </main>
  )
}
