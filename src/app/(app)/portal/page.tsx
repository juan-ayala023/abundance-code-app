import type { Metadata } from 'next'

import { resolveAccess } from '@/lib/access/entitlement'

export const metadata: Metadata = {
  title: 'Tu portal · Abundance Code',
}

export default async function PortalPage() {
  // El layout ya garantizó el acceso; aquí solo se leen los datos.
  const access = await resolveAccess()
  const plan = access.kind === 'concedido' ? access.entitlement.plan : null

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Tu portal</h1>
      <p className="opacity-80">
        Acceso verificado{plan ? ` · plan ${plan}` : ''}.
      </p>
      <p className="text-sm opacity-70">
        El onboarding, la carta natal y la lectura llegan en las siguientes
        fases.
      </p>
    </main>
  )
}
