'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'

import {
  ESTADO_INICIAL,
  guardarDatosNacimiento,
} from '@/app/(app)/onboarding/actions'
import type { Place } from '@/lib/geo/types'

import { BuscadorCiudades } from './buscador-ciudades'

export function FormularioNacimiento({ nombreInicial }: { nombreInicial: string }) {
  const [estado, accion] = useActionState(guardarDatosNacimiento, ESTADO_INICIAL)
  const [horaDesconocida, setHoraDesconocida] = useState(false)
  const [, setLugar] = useState<Place | null>(null)

  return (
    <form action={accion} className="flex flex-col gap-6">
      <Campo etiqueta="Nombre completo" error={estado.campos.fullName}>
        <input
          name="fullName"
          type="text"
          required
          defaultValue={nombreInicial}
          autoComplete="name"
          className="rounded-lg border border-black/15 px-4 py-3 dark:border-white/20"
        />
      </Campo>

      <Campo etiqueta="Fecha de nacimiento" error={estado.campos.birthDate}>
        <input
          name="birthDate"
          type="date"
          required
          max={new Date().toISOString().slice(0, 10)}
          className="rounded-lg border border-black/15 px-4 py-3 dark:border-white/20"
        />
      </Campo>

      <Campo etiqueta="Hora de nacimiento" error={estado.campos.birthTime}>
        <input
          name="birthTime"
          type="time"
          disabled={horaDesconocida}
          className="rounded-lg border border-black/15 px-4 py-3 disabled:opacity-50 dark:border-white/20"
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
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
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
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm"
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
      className="rounded-lg bg-black px-5 py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
    >
      {pending ? 'Guardando…' : 'Continuar'}
    </button>
  )
}

function Campo({
  etiqueta,
  error,
  children,
}: {
  etiqueta: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{etiqueta}</span>
      {children}
      {error ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  )
}
