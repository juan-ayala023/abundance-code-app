import { Activity, CalendarDays, Mail, Sparkles, Sun, User } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { cerrarSesion } from '@/app/actions'
import { abrirPortalDeFacturacion } from './actions'
import { Contenedor } from '@/components/layout/contenedor'
import { EncabezadoPagina } from '@/components/layout/encabezado-pagina'
import { Insignia, Tarjeta } from '@/components/layout/tarjeta'
import { entitlementDe, resolveAccess } from '@/lib/access/entitlement'
import { nivelDeAcceso } from '@/lib/access/nivel'
import { diaDelCiclo } from '@/lib/lectura/ciclo'
import { DIAS_DE_PORTAL } from '@/lib/lectura/schemas'
import { getPublicEnv } from '@/lib/env/public'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Mi cuenta · Abundance Code',
}


export default async function CuentaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const t = await getTranslations('cuenta')
  const tNav = await getTranslations('nav')
  const tSus = await getTranslations('suscripcion')

  /** Lo que pudo salir mal al abrir el portal de facturación. */
  const avisoPortal =
    params.portal === 'error'
      ? t('portalError')
      : params.portal === 'sin-compra'
        ? t('portalSinCompra')
        : undefined

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
        titulo={t('titulo')}
        descripcion={t('descripcion')}
      />

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <Dato Icono={User} etiqueta={t('nombre')} valor={perfil?.full_name ?? '—'} />
        <Dato Icono={Mail} etiqueta={t('email')} valor={perfil?.email ?? '—'} />
        <Dato
          Icono={Sparkles}
          etiqueta={t('plan')}
          valor={entitlement?.plan ?? '—'}
        />
        <Dato
          Icono={CalendarDays}
          etiqueta={t('fechaActivacion')}
          valor={formatearFecha(portal?.created_at ?? perfil?.created_at)}
        />
        {/*
          El original matiza el estado: «Activo · primeros 30 días». Distingue
          estar dentro del ciclo inicial de tener una suscripción en marcha, que
          es justo lo que decide si la guía sigue abierta.
        */}
        <Dato
          Icono={Activity}
          etiqueta={t('estadoPortal')}
          valor={
            entitlement
              ? [
                  t(`estados.${entitlement.status}` as never) || entitlement.status,
                  ciclo && !ciclo.terminado ? t('primerosDias', { total: ciclo.total }) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : '—'
          }
        />
        <Dato
          Icono={Sun}
          etiqueta={t('diaActual')}
          valor={ciclo ? tNav('dia', { dia: ciclo.dia, total: ciclo.total }) : '—'}
        />
      </div>

      {/*
        Falta «Código activado», que la app anterior sí muestra. No se pinta
        porque `activation_codes` no está modelado: depende de si se migran los
        usuarios del sistema anterior, que sigue sin decidirse. Inventar un
        código sería peor que su ausencia — el usuario lo conserva y lo compara.
      */}
      <Tarjeta className="bg-oro-palido/40 text-sm leading-relaxed text-tinta-suave">
        {nivel === 'solo-lectura'
          ? tSus('mensaje')
          : t('incluye', { total: DIAS_DE_PORTAL })}
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
          {tSus('continuar')}
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
              {t('gestionar')}
            </button>
          </form>
        ) : null}

        <form action={cerrarSesion}>
          <button
            type="submit"
            className="rounded-xl border border-borde bg-superficie px-6 py-3 font-medium transition-colors hover:bg-fondo-hondo"
          >
            {tNav('cerrarSesion')}
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
