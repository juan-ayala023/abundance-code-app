'use client'

import { useState } from 'react'

import { CONSULTAS_GUIA_POR_DIA } from '@/lib/lectura/schemas'

const SUGERENCIAS = [
  '¿Qué bloqueo necesito observar ahora?',
  '¿Qué decisión estoy evitando?',
  '¿Qué patrón de abundancia estoy repitiendo?',
  '¿Qué señal debería mirar esta semana?',
  '¿Qué energía necesito activar hoy?',
] as const

const MAXIMO = 500

/**
 * Formulario de consulta a la guía.
 *
 * Todavía no envía nada: la capa de IA no está conectada. El botón lo dice de
 * forma explícita en vez de fingir que funciona y dejar al usuario esperando
 * una respuesta que no va a llegar.
 */
export function FormularioConsulta() {
  const [pregunta, setPregunta] = useState('')

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(evento) => evento.preventDefault()}
    >
      <div className="flex flex-col gap-2">
        <label
          htmlFor="pregunta"
          className="text-[0.65rem] uppercase tracking-[0.18em] text-tinta-tenue"
        >
          ¿Qué necesitas entender hoy?
        </label>
        <textarea
          id="pregunta"
          name="pregunta"
          rows={5}
          maxLength={MAXIMO}
          value={pregunta}
          onChange={(evento) => setPregunta(evento.target.value)}
          placeholder="Escribe tu pregunta aquí…"
          className="resize-y rounded-2xl border border-borde bg-fondo px-4 py-3 leading-relaxed"
        />
        <p className="self-end text-xs text-tinta-tenue" aria-live="polite">
          {pregunta.length} / {MAXIMO}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-center text-sm text-tinta-suave">— Preguntas sugeridas —</p>
        <ul className="flex flex-wrap justify-center gap-2">
          {SUGERENCIAS.map((sugerencia) => (
            <li key={sugerencia}>
              <button
                type="button"
                onClick={() => setPregunta(sugerencia)}
                className="rounded-full border border-borde bg-superficie px-4 py-2 text-sm text-tinta-suave transition-colors hover:bg-fondo-hondo"
              >
                {sugerencia}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="submit"
        disabled
        className="mx-auto rounded-xl bg-oro px-8 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        Consultar mi guía
      </button>

      <p className="text-center text-sm text-tinta-tenue">
        Disponible cuando conectemos la capa de interpretación.
      </p>

      <p className="text-center text-sm text-tinta-suave">
        {CONSULTAS_GUIA_POR_DIA} consultas por día incluidas durante tu período
        activo.
      </p>
    </form>
  )
}
