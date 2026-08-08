import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { FormularioConsulta } from '@/components/guia/formulario-consulta'
import { EncabezadoPagina } from '@/components/layout/encabezado-pagina'
import { Tarjeta } from '@/components/layout/tarjeta'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Guía personalizada · Abundance Code',
}

export default async function GuiaPage() {
  const supabase = await createClient()

  const { data: portal } = await supabase
    .from('portals')
    .select('birth_date')
    .maybeSingle()

  if (!portal?.birth_date) redirect('/onboarding')

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10 lg:px-10">
      <EncabezadoPagina
        titulo="Guía personalizada"
        descripcion="Consulta tu carta cuando necesites claridad sobre una decisión, un bloqueo o una señal que estás viviendo."
        volver={{ href: '/portal', texto: 'Volver a mi portal' }}
      />

      <Tarjeta className="flex flex-col gap-8">
        <p className="italic leading-relaxed text-tinta-suave">
          A veces no necesitas más información. A veces, lo que necesitas es
          claridad. Tu carta tiene respuestas: haz tu pregunta desde la
          intención.
        </p>

        <FormularioConsulta />
      </Tarjeta>

      {/*
        El aviso legal viene del producto anterior y no es decorativo: coincide
        con los guardrails de CLAUDE.md §8, que prohíben dar consejo médico,
        legal o financiero.
      */}
      <p className="text-center text-sm text-tinta-tenue">
        La guía personalizada está diseñada para reflexión personal y claridad
        interna. No reemplaza asesoría médica, legal, financiera o psicológica
        profesional.
      </p>
    </main>
  )
}
