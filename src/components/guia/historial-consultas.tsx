import { History } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Estrella } from '@/components/layout/estrella'
import { Insignia, Tarjeta } from '@/components/layout/tarjeta'
import { idiomaActual } from '@/i18n/idioma'
import { fechaYHora } from '@/lib/time/formato'

/**
 * Las conversaciones anteriores de la persona, con sus respuestas.
 *
 * Existe por un hallazgo de la revisión de septiembre de 2026: la guía
 * respondió, el contador bajó, y al recargar la respuesta había desaparecido
 * sin forma visible de recuperarla. **No se había borrado**: cada consulta se
 * guarda en `guidance_queries` con pregunta, respuesta y fecha desde el primer
 * día, y la política RLS ya le concede `select` al dueño. Lo que faltaba era
 * una pantalla que las leyera. Esto es esa pantalla.
 *
 * Desde el 23 de septiembre de 2026 se agrupan por hilo: una consulta y sus
 * dos preguntas de profundizar son una sola conversación, y separarlas en tres
 * filas sueltas rompería justamente lo que se acaba de construir.
 *
 * Leerlas no cuesta ninguna consulta: es una lectura de la base, no una
 * llamada al modelo. El contador solo baja en `consultarGuia()`.
 */

export type ConsultaGuardada = {
  id: string
  question: string
  answer: string | null
  created_at: string
  /** Puede faltar en filas anteriores a los hilos: entonces cada una es la suya. */
  thread_id?: string | null
  tipo?: string | null
}

export async function HistorialConsultas({ consultas }: { consultas: ConsultaGuardada[] }) {
  const t = await getTranslations('guia.historial')
  const idioma = await idiomaActual()

  const hilos = agruparEnHilos(consultas)

  return (
    <Tarjeta className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Insignia Icono={History} />
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-light">{t('titulo')}</h2>
          <p className="text-sm text-tinta-suave">{t('nota')}</p>
        </div>
      </div>

      {hilos.length === 0 ? (
        <p className="text-sm text-tinta-tenue">{t('vacio')}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-borde">
          {hilos.map((hilo) => (
            <li key={hilo[0]!.id} className="py-3 first:pt-0 last:pb-0">
              {/*
                `<details>` nativo y no un acordeón de cliente: no hace falta
                JavaScript para abrir una conversación guardada, y el navegador
                ya sabe hacerlo accesible.
              */}
              <details className="group">
                <summary className="flex cursor-pointer list-none flex-col gap-1 rounded-xl px-2 py-2 transition-colors hover:bg-fondo-hondo/60">
                  <time
                    dateTime={hilo[0]!.created_at}
                    className="text-[0.65rem] uppercase tracking-[0.18em] text-tinta-tenue"
                  >
                    {fechaYHora(hilo[0]!.created_at, idioma)}
                    {hilo.length > 1 ? ` · ${t('mensajes', { n: hilo.length })}` : ''}
                  </time>
                  <span className="flex items-start gap-2 text-sm leading-relaxed">
                    <Estrella className="mt-1 shrink-0 text-oro" />
                    <span>«{hilo[0]!.question}»</span>
                  </span>
                </summary>

                <div className="mt-2 flex flex-col gap-4">
                  {hilo.map((mensaje, indice) => (
                    <div
                      key={mensaje.id}
                      className="flex flex-col gap-3 rounded-2xl border border-borde bg-oro-palido/40 px-5 py-4"
                    >
                      {/* La primera pregunta ya está arriba, en el resumen. */}
                      {indice > 0 ? (
                        <p className="text-sm italic text-tinta-tenue">«{mensaje.question}»</p>
                      ) : null}

                      {mensaje.answer ? (
                        mensaje.answer.split(/\n{2,}/).map((parrafo, i) => (
                          <p key={i} className="text-sm leading-relaxed text-tinta-suave">
                            {parrafo}
                          </p>
                        ))
                      ) : (
                        <p className="text-sm italic text-tinta-tenue">{t('sinRespuesta')}</p>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  )
}

/**
 * Las filas agrupadas en conversaciones.
 *
 * Llegan de más nueva a más antigua, que es el orden en que se quieren leer
 * los hilos; dentro de cada uno, el orden se invierte, porque una conversación
 * se lee desde el principio.
 */
function agruparEnHilos(consultas: ConsultaGuardada[]): ConsultaGuardada[][] {
  const hilos = new Map<string, ConsultaGuardada[]>()

  for (const consulta of consultas) {
    const clave = consulta.thread_id ?? consulta.id
    hilos.set(clave, [...(hilos.get(clave) ?? []), consulta])
  }

  return [...hilos.values()].map((hilo) => [...hilo].reverse())
}
