import { redirect } from 'next/navigation'

import { Logo } from '@/components/layout/logo'
import { NavLateral } from '@/components/layout/nav-lateral'
import { resolveAccess } from '@/lib/access/entitlement'
import { diaDelCiclo } from '@/lib/lectura/ciclo'
import { createClient } from '@/lib/supabase/server'

/**
 * Puerta de entrada al portal, y armazón de todas sus pantallas.
 *
 * El middleware ya descartó a quien no tiene sesión; aquí se comprueba lo que
 * el middleware no puede: que exista una compra activa. Se ejecuta una vez por
 * navegación, no por cada recurso.
 *
 * Toda página bajo (app) hereda la comprobación y la navegación: ninguna puede
 * olvidarse de hacer una ni de pintar la otra.
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const access = await resolveAccess()

  switch (access.kind) {
    case 'anonimo':
      redirect('/activar')
    case 'sin-compra':
      redirect('/activar/vincular')
    case 'inactivo':
      redirect('/activar/vincular?estado=inactivo')
    case 'concedido':
      break
  }

  const supabase = await createClient()
  const { data: portal } = await supabase
    .from('portals')
    .select('created_at')
    .maybeSingle()

  const ciclo = diaDelCiclo(portal?.created_at)

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-64 shrink-0 flex-col gap-10 border-r border-borde bg-fondo px-6 py-8 lg:flex">
        <Logo />
        <NavLateral ciclo={ciclo} />
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
