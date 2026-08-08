import { CircleHelp, Eye, MinusCircle, Sparkles, Sun } from 'lucide-react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AvisoPendiente, EncabezadoPagina } from '@/components/layout/encabezado-pagina'
import { Insignia, Tarjeta } from '@/components/layout/tarjeta'
import { activacionDiariaSchema } from '@/lib/lectura/schemas'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Activación de hoy · Abundance Code',
}

const BLOQUES = [
  { clave: 'mensajePrincipal', titulo: 'Mensaje principal', Icono: Sparkles },
  { clave: 'queObservar', titulo: 'Qué observar hoy', Icono: Eye },
  { clave: 'queEvitar', titulo: 'Qué evitar', Icono: MinusCircle },
  { clave: 'queActivar', titulo: 'Qué activar', Icono: Sun },
  { clave: 'preguntaReflexion', titulo: 'Pregunta de reflexión', Icono: CircleHelp },
] as const

export default async function ActivacionPage() {
  const supabase = await createClient()

  const { data: portal } = await supabase
    .from('portals')
    .select('id, birth_date')
    .maybeSingle()

  if (!portal?.birth_date) redirect('/onboarding')

  // La activación del día se busca por número de día dentro del ciclo. El
  // ciclo de 30 días todavía no está modelado, así que de momento se consulta
  // la más reciente que exista.
  const { data: activacion } = await supabase
    .from('daily_activations')
    .select('day_number, content, read_at')
    .order('day_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  const contenido = activacionDiariaSchema.safeParse(activacion?.content)

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10 lg:px-10">
      <EncabezadoPagina
        titulo={
          activacion ? `Activación del día ${activacion.day_number}` : 'Activación de hoy'
        }
        descripcion="Una señal para observar hoy, leída desde tu carta natal."
        volver={{ href: '/portal', texto: 'Volver a mi portal' }}
      />

      {contenido.success ? (
        <Tarjeta className="flex flex-col divide-y divide-borde">
          {BLOQUES.map(({ clave, titulo, Icono }) => (
            <section key={clave} className="flex gap-4 py-5 first:pt-0 last:pb-0">
              <Insignia Icono={Icono} />
              <div className="min-w-0">
                <h2 className="text-lg font-light">{titulo}</h2>
                <p className="mt-1 text-sm leading-relaxed text-tinta-suave">
                  {contenido.data[clave]}
                </p>
              </div>
            </section>
          ))}
        </Tarjeta>
      ) : (
        <>
          <AvisoPendiente>
            Todavía no hay activaciones generadas. Estas son las partes que
            tendrá cada una.
          </AvisoPendiente>

          <Tarjeta className="flex flex-col divide-y divide-borde">
            {BLOQUES.map(({ clave, titulo, Icono }) => (
              <section key={clave} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                <Insignia Icono={Icono} />
                <h2 className="text-lg font-light text-tinta-suave">{titulo}</h2>
              </section>
            ))}
          </Tarjeta>
        </>
      )}
    </main>
  )
}
