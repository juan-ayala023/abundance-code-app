'use client'

import { useTranslations } from 'next-intl'
import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'

import { guardarDatosNacimiento } from '@/app/(app)/onboarding/actions'
import { ESTADO_INICIAL } from '@/app/(app)/onboarding/estado'
import type { Place } from '@/lib/geo/types'

import { BuscadorCiudades } from './buscador-ciudades'

/** Lo que hay guardado, para el modo de corrección. Ver `onboarding/page.tsx`. */
export type ValoresIniciales = {
  birthDate: string
  birthTime: string
  timeUnknown: boolean
  lugar: Place | null
}

export function FormularioNacimiento({
  nombreInicial,
  editando = false,
  valoresIniciales,
}: {
  nombreInicial: string
  /** Modo corrección: cambia el texto del botón. La acción es la misma. */
  editando?: boolean
  valoresIniciales?: ValoresIniciales
}) {
  const t = useTranslations('onboarding')
  const [estado, accion] = useActionState(guardarDatosNacimiento, ESTADO_INICIAL)
  const [horaDesconocida, setHoraDesconocida] = useState(valoresIniciales?.timeUnknown ?? false)
  const [, setLugar] = useState<Place | null>(valoresIniciales?.lugar ?? null)

  return (
    <form action={accion} className="flex flex-col gap-6">
      {/* La acción distingue corregir de estrenar: solo en el primer caso archiva lecturas. */}
      {editando ? <input type="hidden" name="editando" value="1" /> : null}
      <Campo id="fullName" etiqueta={t('nombre')} error={estado.campos.fullName}>
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

      <Campo id="birthDate" etiqueta={t('fecha')} error={estado.campos.birthDate}>
        <input
          id="birthDate"
          name="birthDate"
          type="date"
          required
          defaultValue={valoresIniciales?.birthDate}
          max={new Date().toISOString().slice(0, 10)}
          className="rounded-xl border border-borde bg-superficie px-4 py-3"
        />
      </Campo>

      <Campo id="birthTime" etiqueta={t('hora')} error={estado.campos.birthTime}>
        <input
          id="birthTime"
          name="birthTime"
          type="time"
          defaultValue={valoresIniciales?.birthTime}
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
          {t('horaDesconocida')}
        </label>

        {horaDesconocida ? (
          <p className="rounded-2xl border border-oro-claro bg-oro-palido/60 px-4 py-3 text-sm">
            {t.rich('avisoSinHora', { b: (trozo) => <strong>{trozo}</strong> })}
          </p>
        ) : null}
      </Campo>

      <BuscadorCiudades
        onSelect={setLugar}
        inicial={valoresIniciales?.lugar ?? null}
        error={estado.campos.place}
      />

      {estado.error ? (
        <p
          role="alert"
          className="rounded-2xl border border-[#e0b3a8] bg-[#f6e6e1] px-4 py-3 text-sm"
        >
          {estado.error}
        </p>
      ) : null}

      <BotonGuardar editando={editando} />
    </form>
  )
}

function BotonGuardar({ editando }: { editando: boolean }) {
  const t = useTranslations('onboarding')
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-oro px-5 py-3 font-medium text-white transition-colors hover:bg-oro-hondo disabled:opacity-60"
    >
      {pending ? t('guardando') : editando ? t('editar.guardar') : t('continuar')}
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
