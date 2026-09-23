'use client'

import { ShieldCheck } from 'lucide-react'
import { useActionState, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useFormStatus } from 'react-dom'

import { consultarGuia } from '@/app/(app)/guia/actions'
import { ESTADO_INICIAL, type MensajeConsulta } from '@/app/(app)/guia/estado'
import { Estrella } from '@/components/layout/estrella'
import { CONSULTAS_GUIA_POR_MES, SEGUIMIENTOS_POR_CONSULTA } from '@/lib/lectura/schemas'

/*
 * Claves con nombre, no un arreglo. next-intl no resuelve `t('sugeridas.0')`
 * sobre un array de JSON: devuelve la clave en crudo y los botones salen
 * vacíos. Con nombres además se lee a qué pregunta corresponde cada una.
 */
const SUGERENCIAS = ['bloqueo', 'decision', 'patron', 'senal', 'energia'] as const

const MAXIMO = 500
const MINIMO = 10

const CLAVE_BORRADOR = 'guia:borrador'

/**
 * Formulario de consulta a la guía.
 *
 * Desde el 23 de septiembre de 2026 una consulta es una **conversación**: la
 * pregunta, su respuesta y hasta dos preguntas más sobre el mismo tema. Por eso
 * el formulario no se vacía al responder: se queda abajo, debajo del hilo, con
 * las preguntas que quedan.
 *
 * `restantes` es el contador al cargar la página. El límite de verdad lo aplica
 * la acción de servidor: esto es información para el usuario, no la defensa.
 */
export function FormularioConsulta({
  restantes,
  preguntaInicial = '',
}: {
  restantes: number
  /**
   * Pregunta con la que llega el campo ya escrito, cuando se entra desde una de
   * las cinco áreas del portal.
   *
   * Se pasa como estado inicial y no como `defaultValue`: el campo es
   * controlado, así que un `defaultValue` lo dejaría vacío. Y sigue siendo
   * editable a propósito —es una pregunta de partida, no un formulario cerrado—:
   * la mayoría la va a retocar antes de enviarla, que es justo lo que se busca.
   */
  preguntaInicial?: string
}) {
  const t = useTranslations('guia_form')
  /*
   * La pregunta se guarda en el navegador mientras se escribe. Si la pantalla
   * se cae a medias (un corte de red al enviar), al recargar vuelve al cuadro:
   * no hay que volver a escribirla.
   */
  const [pregunta, setPregunta] = useState(preguntaInicial)
  const [estado, enviar] = useActionState(consultarGuia, ESTADO_INICIAL)

  // Tras montar, y no en el estado inicial: el servidor no tiene sessionStorage
  // y un valor distinto entre servidor y cliente rompería la hidratación.
  useEffect(() => {
    if (preguntaInicial) return
    try {
      const guardada = sessionStorage.getItem(CLAVE_BORRADOR)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restaura un borrador externo (sessionStorage) una sola vez
      if (guardada) setPregunta(guardada)
    } catch { /* sin almacenamiento */ }
  }, [preguntaInicial])

  useEffect(() => {
    try {
      if (estado.mensajes.length > 0) sessionStorage.removeItem(CLAVE_BORRADOR)
      else sessionStorage.setItem(CLAVE_BORRADOR, pregunta)
    } catch { /* sin almacenamiento */ }
  }, [pregunta, estado.mensajes.length])

  /* Al responder, el cuadro se vacía: lo siguiente que se escriba es otra cosa. */
  const ultimo = estado.mensajes.at(-1)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- limpia el cuadro cuando llega una respuesta nueva
    if (ultimo) setPregunta('')
  }, [ultimo])

  const enHilo = estado.mensajes.length > 0
  /* Una aclaración no gasta seguimiento: responderla no consume nada. */
  const respondiendoAclaracion = ultimo?.tipo === 'aclaracion'
  const puedeSeguir =
    enHilo && (respondiendoAclaracion || estado.seguimientosRestantes > 0)

  /* Si ya se abrió un hilo, esa consulta del mes ya está gastada. */
  const disponibles = enHilo ? Math.max(restantes - 1, 0) : restantes
  const agotadas = !enHilo && disponibles <= 0
  const suficiente = pregunta.trim().length >= MINIMO

  return (
    <div className="flex flex-col gap-8">
      {enHilo ? <Hilo mensajes={estado.mensajes} /> : null}

      <form action={enviar} className="flex flex-col gap-6">
        {/* El hilo abierto viaja con cada envío: así el servidor sabe que es
            un seguimiento y no una consulta nueva. */}
        {estado.hilo ? <input type="hidden" name="hilo" value={estado.hilo} /> : null}

        <div className="flex flex-col gap-2">
          <label
            htmlFor="pregunta"
            className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.18em] text-tinta-tenue"
          >
            <Estrella className="text-oro" />
            {enHilo ? t('preguntaSeguimiento') : t('pregunta')}
          </label>
          <textarea
            id="pregunta"
            name="pregunta"
            rows={enHilo ? 3 : 5}
            maxLength={MAXIMO}
            value={pregunta}
            onChange={(evento) => setPregunta(evento.target.value)}
            placeholder={enHilo ? t('placeholderSeguimiento') : t('placeholder')}
            disabled={enHilo && !puedeSeguir}
            className="resize-y rounded-2xl border border-borde bg-fondo px-4 py-3 leading-relaxed disabled:opacity-60"
          />
          <p className="self-end text-xs text-tinta-tenue" aria-live="polite">
            {pregunta.length} / {MAXIMO}
          </p>
        </div>

        {/* Las sugerencias solo al empezar: dentro de un tema, estorban. */}
        {!enHilo ? (
          <div className="flex flex-col gap-3">
            <p className="text-center text-sm text-tinta-suave">{t('sugeridasTitulo')}</p>
            <ul className="flex flex-wrap justify-center gap-2">
              {SUGERENCIAS.map((clave) => {
                const sugerencia = t(`sugeridas.${clave}` as never)
                return (
                  <li key={clave}>
                    <button
                      type="button"
                      onClick={() => setPregunta(sugerencia)}
                      className="rounded-full border border-borde bg-superficie px-4 py-2 text-sm text-tinta-suave transition-colors hover:bg-fondo-hondo"
                    >
                      {sugerencia}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}

        <Enviar
          deshabilitado={(enHilo ? !puedeSeguir : agotadas) || !suficiente}
          enHilo={enHilo}
        />

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
            {enHilo ? (
              respondiendoAclaracion ? (
                t('aclaracionNoGasta')
              ) : estado.seguimientosRestantes > 0 ? (
                t('puedesSeguir', { n: estado.seguimientosRestantes })
              ) : (
                t('temaCerrado')
              )
            ) : agotadas ? (
              t('agotadas', { total: CONSULTAS_GUIA_POR_MES })
            ) : (
              t.rich('restantes', {
                n: disponibles,
                total: CONSULTAS_GUIA_POR_MES,
                seguimientos: SEGUIMIENTOS_POR_CONSULTA,
                b: (trozo) => <strong>{trozo}</strong>,
              })
            )}
          </span>
        </p>
      </form>
    </div>
  )
}

/** La conversación: lo que se preguntó y lo que contestó la guía. */
function Hilo({ mensajes }: { mensajes: MensajeConsulta[] }) {
  const t = useTranslations('guia_form')

  return (
    <div className="flex flex-col gap-5">
      {mensajes.map((mensaje, indice) => (
        <article
          key={indice}
          className="flex flex-col gap-3 rounded-2xl border border-borde bg-oro-palido/40 px-5 py-5"
        >
          <p className="text-sm italic text-tinta-tenue">«{mensaje.pregunta}»</p>
          <h3 className="flex items-center gap-3 text-lg font-light">
            <Estrella />
            {mensaje.tipo === 'aclaracion' ? t('preguntaDeVuelta') : t('responde')}
          </h3>
          {/* El modelo separa en párrafos; respetarlos hace la respuesta legible. */}
          {mensaje.respuesta.split(/\n{2,}/).map((parrafo, i) => (
            <p key={i} className="leading-relaxed text-tinta-suave">
              {parrafo}
            </p>
          ))}
        </article>
      ))}
    </div>
  )
}

/**
 * El botón necesita su propio componente: `useFormStatus` solo informa del
 * formulario que lo contiene, así que desde el componente del formulario no
 * vería nada.
 */
function Enviar({ deshabilitado, enHilo }: { deshabilitado: boolean; enHilo: boolean }) {
  const t = useTranslations('guia')
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={deshabilitado || pending}
      className="mx-auto flex items-center gap-2.5 rounded-full bg-oro px-10 py-4 text-lg font-medium text-white shadow-sm transition-colors hover:bg-oro-hondo disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Estrella className="text-white" />
      {pending ? t('consultando') : enHilo ? t('profundizar') : t('consultar')}
    </button>
  )
}
