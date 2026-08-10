import { redirect } from 'next/navigation'

import { Logo } from '@/components/layout/logo'
import { NavLateral } from '@/components/layout/nav-lateral'
import { NavMovil } from '@/components/layout/nav-movil'
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
      // Nunca compró: no hay nada suyo que enseñar.
      redirect('/activar/vincular')
    /*
     * `inactivo` NO se expulsa, y esta es la diferencia importante.
     *
     * Es quien pagó y luego canceló o dejó de pagar. Antes se le mandaba a
     * `/activar/vincular` y perdía el portal entero —incluida la lectura base
     * que ya había pagado y leído—, porque `nivelDeAcceso()` ni llegaba a
     * ejecutarse.
     *
     * Con el precio real —49 $ el primer mes, 15 $/mes después— en Stripe todo
     * comprador es un suscriptor, así que este es el estado de **cualquiera que
     * se dé de baja**: el caso normal, no el borde. Y quitarle la lectura
     * contradice lo que el producto le promete por escrito en Mi Cuenta.
     *
     * Entra, y `nivelDeAcceso()` le da `solo-lectura`: conserva lectura y
     * carta, y la guía y las activaciones piden suscripción.
     */
    case 'inactivo':
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
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Por debajo de `lg` la barra lateral desaparece: ahí manda el cajón. */}
      <NavMovil ciclo={ciclo} />

      <aside className="hidden w-72 shrink-0 flex-col gap-10 border-r border-borde bg-fondo px-7 py-9 lg:flex">
        <Logo />
        <NavLateral ciclo={ciclo} />
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
