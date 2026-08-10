'use client'

import { ShieldCheck } from 'lucide-react'
import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'

import { consultarGuia } from '@/app/(app)/guia/actions'
import { ESTADO_INICIAL } from '@/app/(app)/guia/estado'
import { Estrella } from '@/components/layout/estrella'
import { CONSULTAS_GUIA_POR_DIA } from '@/lib/lectura/schemas'

const SUGERENCIAS = [
  '¿Qué bloqueo necesito observar ahora?',
  '¿Qué decisión estoy evitando?',
  '¿Qué patrón de abundancia estoy repitiendo?',
  '¿Qué señal debería mirar esta semana?',
  '¿Qué energía necesito activar hoy?',
] as const

const MAXIMO = 500
const MINIMO = 10

/**
 * Formulario de consulta a la guía.
 *
 * `restantes` es el contador al cargar la página. El límite de verdad lo aplica
 * la acción de servidor: esto es información para el usuario, no la defensa.
 */
export function FormularioConsulta({ restantes }: { restantes: number }) {
  const [pregunta, setPregunta] = useState('')
  const [estado, enviar] = useActionState(consultarGuia, ESTADO_INICIAL)

  // Si acaba de responderse una consulta, ya se ha gastado.
  const disponibles = estado.respuesta ? Math.max(restantes - 1, 0) : restantes
  const agotadas = disponibles <= 0
  const suficiente = pregunta.trim().length >= MINIMO

  return (
    <div className="flex flex-col gap-8">
      <form action={enviar} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="pregunta"
            className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.18em] text-tinta-tenue"
          >
            <Estrella className="text-oro" />
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

        <Enviar deshabilitado={agotadas || !suficiente} />

        {estado.error ? (
          <p role="alert" className="text-center text-sm text-tinta">
            {estado.error}
          </p>
        ) : null}

        {/*
          El texto va dentro de un `span` y no suelto en el `p`.
          `display: flex` convierte en elemento de flex CADA hijo, incluidos los
          trozos de texto entre etiquetas: «Te quedan», el número y el resto de
          la frase se repartían en tres columnas que se estrechaban hasta partir
          «Te quedan» en dos líneas. Con el texto en un solo hijo, el flex
          coloca dos cosas —icono y frase— que es lo que se pretendía.
        */}
        <p
          className="flex items-center justify-center gap-2 text-center text-sm text-tinta-suave"
          aria-live="polite"
        >
          <ShieldCheck size={15} aria-hidden="true" className="shrink-0 text-oro" />
          <span>
            {agotadas ? (
              <>
                Has usado tus {CONSULTAS_GUIA_POR_DIA} consultas de hoy. Vuelven
                a estar disponibles mañana.
              </>
            ) : (
              <>
                Te quedan <strong>{disponibles}</strong> de{' '}
                {CONSULTAS_GUIA_POR_DIA} consultas por día, incluidas durante tu
                período activo.
              </>
            )}
          </span>
        </p>
      </form>

      {estado.respuesta ? (
        <article className="flex flex-col gap-3 rounded-2xl border border-borde bg-oro-palido/40 px-5 py-5">
          {estado.pregunta ? (
            <p className="text-sm italic text-tinta-tenue">«{estado.pregunta}»</p>
          ) : null}
          <h2 className="flex items-center gap-3 text-xl font-light">
            <Estrella />
            Tu guía responde
          </h2>
          {/* El modelo separa en párrafos; respetarlos hace la respuesta legible. */}
          {estado.respuesta.split(/\n{2,}/).map((parrafo, indice) => (
            <p key={indice} className="leading-relaxed text-tinta-suave">
              {parrafo}
            </p>
          ))}
        </article>
      ) : null}
    </div>
  )
}

/**
 * El botón necesita su propio componente: `useFormStatus` solo informa del
 * formulario que lo contiene, así que desde el componente del formulario no
 * vería nada.
 */
function Enviar({ deshabilitado }: { deshabilitado: boolean }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={deshabilitado || pending}
      className="mx-auto flex items-center gap-2.5 rounded-full bg-oro px-10 py-4 text-lg font-medium text-white shadow-sm transition-colors hover:bg-oro-hondo disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Estrella className="text-white" />
      {pending ? 'Consultando tu Código Personal…' : 'Consultar mi guía'}
    </button>
  )
}
