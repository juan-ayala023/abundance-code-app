import { Activity, CalendarDays, Mail, Sparkles, Sun, User } from 'lucide-react'
import type { Metadata } from 'next'

import { cerrarSesion } from '@/app/actions'
import { EncabezadoPagina } from '@/components/layout/encabezado-pagina'
import { Insignia, Tarjeta } from '@/components/layout/tarjeta'
import { resolveAccess } from '@/lib/access/entitlement'
import { DIAS_DE_PORTAL } from '@/lib/lectura/schemas'
import { getPublicEnv } from '@/lib/env/public'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Mi cuenta · Abundance Code',
}

const ESTADO_LEGIBLE: Record<string, string> = {
  active: 'Activo',
  trialing: 'En periodo de prueba',
  past_due: 'Pago pendiente',
  canceled: 'Cancelado',
  none: 'Sin acceso',
}

export default async function CuentaPage() {
  const supabase = await createClient()
  const acceso = await resolveAccess()

  const { data: perfil } = await supabase
    .from('profiles')
    .select('full_name, email, created_at')
    .maybeSingle()

  const entitlement = acceso.kind === 'concedido' ? acceso.entitlement : null
  const landingUrl = getPublicEnv().NEXT_PUBLIC_LANDING_URL

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10 lg:px-10">
      <EncabezadoPagina
        titulo="Mi cuenta"
        descripcion="Administra tu información y el estado de tu portal."
      />

      <div className="grid gap-5 md:grid-cols-2">
        <Dato Icono={User} etiqueta="Nombre" valor={perfil?.full_name ?? '—'} />
        <Dato Icono={Mail} etiqueta="Email" valor={perfil?.email ?? '—'} />
        <Dato
          Icono={Sparkles}
          etiqueta="Plan"
          valor={entitlement?.plan ?? '—'}
        />
        <Dato
          Icono={CalendarDays}
          etiqueta="Miembro desde"
          valor={formatearFecha(perfil?.created_at)}
        />
        <Dato
          Icono={Activity}
          etiqueta="Estado del portal"
          valor={
            entitlement ? (ESTADO_LEGIBLE[entitlement.status] ?? entitlement.status) : '—'
          }
        />
        <Dato
          Icono={Sun}
          etiqueta="Renovación"
          valor={formatearFecha(entitlement?.current_period_end)}
        />
      </div>

      {/*
        La app anterior muestra aquí «Día N de 30» y el código de activación.
        Ninguno de los dos está modelado todavía, así que no se pintan: un
        contador inventado sería peor que su ausencia.
      */}
      <Tarjeta className="bg-oro-palido/40 text-sm leading-relaxed text-tinta-suave">
        Tu portal incluye {DIAS_DE_PORTAL} días de guía activa. Después, tu
        lectura base seguirá disponible; la guía personalizada y las funciones
        avanzadas requieren una suscripción activa.
      </Tarjeta>

      <div className="flex flex-wrap gap-4">
        <a
          href={landingUrl}
          className="rounded-xl bg-oro px-6 py-3 font-medium text-white transition-colors hover:bg-oro-hondo"
        >
          Continuar con suscripción →
        </a>

        <form action={cerrarSesion}>
          <button
            type="submit"
            className="rounded-xl border border-borde bg-superficie px-6 py-3 font-medium transition-colors hover:bg-fondo-hondo"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  )
}

function Dato({
  Icono,
  etiqueta,
  valor,
}: {
  Icono: typeof User
  etiqueta: string
  valor: string
}) {
  return (
    <Tarjeta className="flex items-center gap-4">
      <Insignia Icono={Icono} />
      <div className="min-w-0">
        <p className="text-[0.65rem] uppercase tracking-[0.18em] text-tinta-tenue">
          {etiqueta}
        </p>
        <p className="truncate text-lg font-light">{valor}</p>
      </div>
    </Tarjeta>
  )
}

function formatearFecha(valor: string | null | undefined): string {
  if (!valor) return '—'

  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return '—'

  return fecha.toLocaleDateString('es', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
