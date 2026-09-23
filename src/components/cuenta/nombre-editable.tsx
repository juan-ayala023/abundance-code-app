'use client'

import { Check, PencilLine } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'

import { guardarNombre } from '@/app/(app)/cuenta/actions'
import { ESTADO_INICIAL } from '@/app/(app)/cuenta/estado'

/**
 * El nombre, cambiable desde aquí mismo.
 *
 * El documento del 23 de septiembre separa las dos cosas que antes iban
 * juntas: el nombre se cambia directamente —no afecta a la carta ni a nada
 * escrito— y el nacimiento pasa por soporte. Antes ambos vivían en el
 * formulario de alta, y para corregir una letra había que volver a pasar por
 * la pantalla que recalcula la carta.
 *
 * Lo que se enseña tras guardar es **lo que devolvió el servidor**, no lo que
 * hay en la pantalla: la acción confirma que la fila se escribió de verdad.
 */
export function NombreEditable({ nombre }: { nombre: string }) {
  const t = useTranslations('cuenta')
  const [estado, guardar] = useActionState(guardarNombre, ESTADO_INICIAL)
  const [editando, setEditando] = useState(false)

  /* Al confirmarse el guardado, se vuelve a la vista de lectura. */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- cierra la edición cuando el servidor confirma
    if (estado.nombre) setEditando(false)
  }, [estado.nombre])

  const actual = estado.nombre ?? nombre

  if (!editando) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.65rem] uppercase tracking-[0.18em] text-tinta-tenue">
              {t('nombre')}
            </p>
            <p className="wrap-anywhere text-lg font-light">{actual}</p>
          </div>
          <button
            type="button"
            onClick={() => setEditando(true)}
            aria-label={t('cambiarNombre')}
            className="shrink-0 rounded-full border border-borde p-2 text-tinta-suave transition-colors hover:bg-fondo-hondo"
          >
            <PencilLine size={15} aria-hidden="true" />
          </button>
        </div>

        {estado.nombre ? (
          <p role="status" className="text-xs text-tinta-tenue">
            {t('nombreGuardado')}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <form action={guardar} className="flex min-w-0 flex-1 flex-col gap-2">
      <label
        htmlFor="nombre"
        className="text-[0.65rem] uppercase tracking-[0.18em] text-tinta-tenue"
      >
        {t('nombre')}
      </label>
      <div className="flex gap-2">
        <input
          id="nombre"
          name="nombre"
          type="text"
          required
          maxLength={80}
          defaultValue={actual}
          autoComplete="name"
          className="min-w-0 flex-1 rounded-xl border border-borde bg-fondo px-3 py-2"
        />
        <Guardar />
      </div>

      {estado.error ? (
        <p role="alert" className="text-xs text-[#a8503c]">
          {estado.error}
        </p>
      ) : null}
    </form>
  )
}

function Guardar() {
  const t = useTranslations('cuenta')
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={t('guardarNombre')}
      className="shrink-0 rounded-xl bg-oro px-4 py-2 text-white transition-colors hover:bg-oro-hondo disabled:opacity-60"
    >
      <Check size={16} aria-hidden="true" />
    </button>
  )
}
