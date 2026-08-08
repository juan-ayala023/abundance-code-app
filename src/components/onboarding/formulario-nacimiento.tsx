'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'

import { guardarDatosNacimiento } from '@/app/(app)/onboarding/actions'
import { ESTADO_INICIAL } from '@/app/(app)/onboarding/estado'
import type { Place } from '@/lib/geo/types'

import { BuscadorCiudades } from './buscador-ciudades'

export function FormularioNacimiento({ nombreInicial }: { nombreInicial: string }) {
  const [estado, accion] = useActionState(guardarDatosNacimiento, ESTADO_INICIAL)
  const [horaDesconocida, setHoraDesconocida] = useState(false)
  const [, setLugar] = useState<Place | null>(null)

  return (
    <form action={accion} className="flex flex-col gap-6">
      <Campo id="fullName" etiqueta="Nombre completo" error={estado.campos.fullName}>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          defaultValue={nombreInicial}
          autoComplete="name"
          className="rounded-xl border border-borde bg-superficie px-4 py-3"
        />
      </Campo>

      <Campo id="birthDate" etiqueta="Fecha de nacimiento" error={estado.campos.birthDate}>
        <input
          id="birthDate"
          name="birthDate"
          type="date"
          required
          max={new Date().toISOString().slice(0, 10)}
          className="rounded-xl border border-borde bg-superficie px-4 py-3"
        />
      </Campo>

      <Campo id="birthTime" etiqueta="Hora de nacimiento" error={estado.campos.birthTime}>
        <input
          id="birthTime"
          name="birthTime"
          type="time"
          disabled={horaDesconocida}
          className="rounded-xl border border-borde bg-superficie px-4 py-3 disabled:opacity-50"
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            name="timeUnknown"
            type="checkbox"
            checked={horaDesconocida}
            onChange={(event) => setHoraDesconocida(event.target.checked)}
          />
          No sé mi hora de nacimiento
        </label>

        {horaDesconocida ? (
          <p className="rounded-2xl border border-oro-claro bg-oro-palido/60 px-4 py-3 text-sm">
            Calcularemos tu carta con el mediodía local. Las posiciones de los
            planetas serán correctas, pero <strong>no podremos incluir las casas,
            el ascendente ni el medio cielo</strong>: esos dependen de la hora
            exacta. Lo verás señalado en tu carta.
          </p>
        ) : null}
      </Campo>

      <BuscadorCiudades onSelect={setLugar} error={estado.campos.place} />

      {estado.error ? (
        <p
          role="alert"
          className="rounded-2xl border border-[#e0b3a8] bg-[#f6e6e1] px-4 py-3 text-sm"
        >
          {estado.error}
        </p>
      ) : null}

      <BotonGuardar />
    </form>
  )
}

function BotonGuardar() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-oro px-5 py-3 font-medium text-white transition-colors hover:bg-oro-hondo disabled:opacity-60"
    >
      {pending ? 'Guardando…' : 'Continuar'}
    </button>
  )
}

/**
 * Etiqueta y campo, asociados de verdad.
 *
 * El `htmlFor` no es decorativo: sin él, un lector de pantalla anuncia un
 * campo sin nombre y pulsar sobre el texto no enfoca el input. Antes esto era
 * un `<span>` y la carencia pasó desapercibida hasta que una prueba e2e no
 * encontró los campos por su nombre accesible.
 */
function Campo({
  id,
  etiqueta,
  error,
  children,
}: {
  id: string
  etiqueta: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {etiqueta}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-sm text-[#a8503c]">
          {error}
        </p>
      ) : null}
    </div>
  )
}
