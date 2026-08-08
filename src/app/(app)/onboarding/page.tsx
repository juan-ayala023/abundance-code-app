import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { FormularioNacimiento } from '@/components/onboarding/formulario-nacimiento'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Tus datos de nacimiento · Abundance Code',
}

export default async function OnboardingPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // El layout de (app) ya garantizó sesión y acceso.
  if (!user) redirect('/activar')

  const { data: portal } = await supabase
    .from('portals')
    .select('birth_date')
    .maybeSingle()

  // Quien ya completó sus datos no tiene que volver a pasar por aquí.
  if (portal?.birth_date) redirect('/portal')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('full_name')
    .maybeSingle()

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-12">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Tus datos de nacimiento
        </h1>
        <p className="opacity-80">
          Con esto calculamos tu carta natal. La hora y el lugar importan tanto
          como la fecha: determinan la posición exacta del cielo sobre ti.
        </p>
      </header>

      <FormularioNacimiento nombreInicial={perfil?.full_name ?? ''} />
    </main>
  )
}
