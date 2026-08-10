import { Activity, CalendarDays, Mail, Sparkles, Sun, User } from 'lucide-react'
import type { Metadata } from 'next'

import { cerrarSesion } from '@/app/actions'
import { abrirPortalDeFacturacion } from './actions'
import { Contenedor } from '@/components/layout/contenedor'
import { EncabezadoPagina } from '@/components/layout/encabezado-pagina'
import { Insignia, Tarjeta } from '@/components/layout/tarjeta'
import { entitlementDe, resolveAccess } from '@/lib/access/entitlement'
import { MENSAJE_SOLO_LECTURA, nivelDeAcceso } from '@/lib/access/nivel'
import { diaDelCiclo } from '@/lib/lectura/ciclo'
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

/** Lo que pudo salir mal al abrir el portal de facturación. */
const AVISOS_PORTAL: Record<string, string> = {
  error:
    'No hemos podido abrir la gestión de tu suscripción ahora mismo. Vuelve a intentarlo en unos minutos.',
  'sin-compra': 'No encontramos una suscripción asociada a tu cuenta.',
}

export default async function CuentaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const avisoPortal =
    typeof params.portal === 'string' ? AVISOS_PORTAL[params.portal] : undefined

  const supabase = await createClient()
  const acceso = await resolveAccess()

  const [{ data: perfil }, { data: portal }] = await Promise.all([
    supabase.from('profiles').select('full_name, email, created_at').maybeSingle(),
    supabase.from('portals').select('created_at').maybeSingle(),
  ])

  const entitlement = entitlementDe(acceso)
  const landingUrl = getPublicEnv().NEXT_PUBLIC_LANDING_URL

  // El mismo contador que ve el usuario en el portal: se deriva de la fecha de
  // creación, no de una columna que pudiera quedar desincronizada.
  const ciclo = diaDelCiclo(portal?.created_at)
  const nivel = nivelDeAcceso(entitlement)

  return (
    <Contenedor>
      <EncabezadoPagina
        titulo="Mi Cuenta"
        descripcion="Administra tu información y el estado de tu portal."
      />

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <Dato Icono={User} etiqueta="Nombre" valor={perfil?.full_name ?? '—'} />
        <Dato Icono={Mail} etiqueta="Email" valor={perfil?.email ?? '—'} />
        <Dato
          Icono={Sparkles}
          etiqueta="Plan"
          valor={entitlement?.plan ?? '—'}
        />
        <Dato
          Icono={CalendarDays}
          etiqueta="Fecha de activación"
          valor={formatearFecha(portal?.created_at ?? perfil?.created_at)}
        />
        {/*
          El original matiza el estado: «Activo · primeros 30 días». Distingue
          estar dentro del ciclo inicial de tener una suscripción en marcha, que
          es justo lo que decide si la guía sigue abierta.
        */}
        <Dato
          Icono={Activity}
          etiqueta="Estado del portal"
          valor={
            entitlement
              ? [
                  ESTADO_LEGIBLE[entitlement.status] ?? entitlement.status,
                  ciclo && !ciclo.terminado ? `primeros ${ciclo.total} días` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : '—'
          }
        />
        <Dato
          Icono={Sun}
          etiqueta="Día actual"
          valor={ciclo ? `Día ${ciclo.dia} de ${ciclo.total}` : '—'}
        />
      </div>

      {/*
        Falta «Código activado», que la app anterior sí muestra. No se pinta
        porque `activation_codes` no está modelado: depende de si se migran los
        usuarios del sistema anterior, que sigue sin decidirse. Inventar un
        código sería peor que su ausencia — el usuario lo conserva y lo compara.
      */}
      <Tarjeta className="bg-oro-palido/40 text-sm leading-relaxed text-tinta-suave">
        {nivel === 'solo-lectura' ? (
          MENSAJE_SOLO_LECTURA
        ) : (
          <>
            Tu portal incluye {DIAS_DE_PORTAL} días de guía activa. Después, tu
            lectura base seguirá disponible; la guía personalizada y las
            funciones avanzadas requieren una suscripción activa.
          </>
        )}
      </Tarjeta>

      {avisoPortal ? (
        <p
          role="alert"
          className="rounded-2xl border border-oro-claro bg-oro-palido/60 px-4 py-3 text-sm"
        >
          {avisoPortal}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-4">
        <a
          href={landingUrl}
          className="rounded-xl bg-oro px-6 py-3 font-medium text-white transition-colors hover:bg-oro-hondo"
        >
          Continuar con suscripción →
        </a>

        {/*
          Cancelar, cambiar la tarjeta y ver facturas los sirve Stripe. No hay
          que construir ninguna de esas pantallas, y esta app no necesita
          ninguna clave suya: la sesión del portal la abre el backend de la
          landing, que es quien tiene el cliente de Stripe.
        */}
        {entitlement ? (
          <form action={abrirPortalDeFacturacion}>
            <button
              type="submit"
              className="rounded-xl border border-borde bg-superficie px-6 py-3 font-medium transition-colors hover:bg-fondo-hondo"
            >
              Gestionar mi suscripción
            </button>
          </form>
        ) : null}

        <form action={cerrarSesion}>
          <button
            type="submit"
            className="rounded-xl border border-borde bg-superficie px-6 py-3 font-medium transition-colors hover:bg-fondo-hondo"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </Contenedor>
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
    /*
      `min-w-0` no es decorativo: un elemento de rejilla vale por defecto
      `min-width: auto`, así que no puede encogerse por debajo de su contenido.
      Sin esto, un email largo ensanchaba la tarjeta más allá de la pantalla y
      el móvil acababa con desplazamiento horizontal.
    */
    <Tarjeta className="flex min-w-0 items-center gap-4">
      <Insignia Icono={Icono} />
      <div className="min-w-0">
        <p className="text-[0.65rem] uppercase tracking-[0.18em] text-tinta-tenue">
          {etiqueta}
        </p>
        {/*
          El valor se parte en varias líneas; antes se truncaba con puntos
          suspensivos. Truncar aquí es cortar justo lo que esta pantalla existe
          para enseñar: en un teléfono, un correo corriente ya no cabía entero y
          el usuario no podía leer el suyo. `anywhere` porque un correo no tiene
          espacios donde partir.
        */}
        <p className="wrap-anywhere text-lg font-light">{valor}</p>
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
