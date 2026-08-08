import { redirect } from 'next/navigation'

import { resolveAccess } from '@/lib/access/entitlement'

/**
 * Puerta de entrada al portal.
 *
 * El middleware ya descartó a quien no tiene sesión; aquí se comprueba lo que
 * el middleware no puede: que exista una compra activa. Se ejecuta una vez por
 * navegación, no por cada recurso.
 *
 * Toda página bajo (app) hereda esta comprobación: ninguna puede olvidarse
 * de hacerla.
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
      return <>{children}</>
  }
}
