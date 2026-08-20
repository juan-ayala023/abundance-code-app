'use client'

import { useTranslations } from 'next-intl'

import { useEffect, useId, useRef, useState } from 'react'

import type { Place } from '@/lib/geo/types'

/**
 * Buscador de ciudad de nacimiento.
 *
 * Devuelve el lugar completo —incluida la zona horaria— y no solo el texto:
 * la carta se calcula con lat, lng y zona, así que un nombre escrito a mano no
 * sirve de nada. Por eso no se puede continuar sin elegir de la lista.
 */
export function BuscadorCiudades({
  onSelect,
  error,
}: {
  onSelect: (place: Place | null) => void
  error?: string
}) {
  const t = useTranslations('onboarding')
  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState<Place[]>([])
  const [buscando, setBuscando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)
  const [elegido, setElegido] = useState<Place | null>(null)

  const listaId = useId()
  const peticion = useRef(0)

  // Si ya eligió, o aún no ha escrito lo suficiente, no hay lista que mostrar.
  // Se deriva en el render en vez de vaciar el estado desde el efecto: así no
  // se encadena un render extra por cada pulsación.
  const buscable = !elegido && texto.trim().length >= 2
  const visibles = buscable ? resultados : []

  useEffect(() => {
    if (!buscable) return

    // Esperar a que deje de teclear evita una petición por pulsación.
    const temporizador = setTimeout(async () => {
      const id = ++peticion.current
      setBuscando(true)
      setFallo(null)

      try {
        const res = await fetch(`/api/geo/search?q=${encodeURIComponent(texto)}`)
        const json = await res.json()

        // Descartar respuestas de búsquedas ya obsoletas.
        if (id !== peticion.current) return

        if (!res.ok) {
          setFallo(json.error ?? 'No pudimos buscar ciudades.')
          setResultados([])
          return
        }

        setResultados(json.places ?? [])
      } catch {
        if (id === peticion.current) setFallo('No pudimos buscar ciudades.')
      } finally {
        if (id === peticion.current) setBuscando(false)
      }
    }, 300)

    return () => clearTimeout(temporizador)
  }, [texto, buscable])

  function elegir(place: Place) {
    setElegido(place)
    setTexto(etiqueta(place))
    setResultados([])
    onSelect(place)
  }

  function reiniciar(valor: string) {
    setTexto(valor)
    if (elegido) {
      setElegido(null)
      onSelect(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="ciudad" className="text-sm font-medium">
        {t('ciudad')}
      </label>

      <input
        id="ciudad"
        type="text"
        autoComplete="off"
        role="combobox"
        aria-expanded={visibles.length > 0}
        aria-controls={listaId}
        aria-describedby={error ? 'ciudad-error' : undefined}
        value={texto}
        onChange={(event) => reiniciar(event.target.value)}
        placeholder={t('ciudadPlaceholder')}
        className="rounded-xl border border-borde bg-superficie px-4 py-3"
      />

      <input type="hidden" name="place" value={elegido ? JSON.stringify(elegido) : ''} />

      <p aria-live="polite" className="text-sm opacity-70">
        {buscando ? 'Buscando…' : null}
        {!buscando && elegido ? `Zona horaria: ${elegido.tz}` : null}
      </p>

      {visibles.length > 0 ? (
        <ul
          id={listaId}
          role="listbox"
          className="divide-y divide-borde overflow-hidden rounded-xl border border-borde bg-superficie"
        >
          {visibles.map((place) => (
            <li key={place.providerId}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => elegir(place)}
                className="w-full px-4 py-3 text-left text-sm transition-colors hover:bg-fondo-hondo"
              >
                {etiqueta(place)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {fallo ? (
        <p role="alert" className="text-sm text-[#a8503c]">
          {fallo}
        </p>
      ) : null}

      {error ? (
        <p id="ciudad-error" role="alert" className="text-sm text-[#a8503c]">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function etiqueta(place: Place): string {
  return [place.city, place.region, place.country].filter(Boolean).join(', ')
}
