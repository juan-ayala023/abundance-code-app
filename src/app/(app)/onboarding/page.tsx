import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
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

  const t = await getTranslations('onboarding')

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-12">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
        <p className="opacity-80">{t('descripcion')}</p>
      </header>

      <FormularioNacimiento nombreInicial={perfil?.full_name ?? ''} />
    </main>
  )
}
