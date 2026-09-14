import { History } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Estrella } from '@/components/layout/estrella'
import { Insignia, Tarjeta } from '@/components/layout/tarjeta'
import { idiomaActual } from '@/i18n/idioma'
import { fechaYHora } from '@/lib/time/formato'

/**
 * Las consultas anteriores de la persona, con su respuesta.
 *
 * Existe por un hallazgo de la revisión de septiembre de 2026: la guía
 * respondió, el contador bajó de 3 a 2, y al recargar la respuesta había
 * desaparecido sin forma visible de recuperarla. **No se había borrado**: cada
 * consulta se guarda en `guidance_queries` con pregunta, respuesta y fecha
 * desde el primer día, y la política RLS ya le concede `select` al dueño. Lo
 * que faltaba era una pantalla que las leyera. Esto es esa pantalla.
 *
 * Leerlas no cuesta ninguna consulta: es una lectura de la base, no una
 * llamada al modelo. El contador solo baja en `consultarGuia()`.
 *
 * Los favoritos que mencionaba la revisión no se añaden: no están en la
 * oferta del producto, y guardar «favoritos» sin una pantalla que los use
 * sería una columna muerta.
 */

export type ConsultaGuardada = {
  id: string
  question: string
  answer: string | null
  created_at: string
}

export async function HistorialConsultas({ consultas }: { consultas: ConsultaGuardada[] }) {
  const t = await getTranslations('guia.historial')
  const idioma = await idiomaActual()

  return (
    <Tarjeta className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Insignia Icono={History} />
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-light">{t('titulo')}</h2>
          <p className="text-sm text-tinta-suave">{t('nota')}</p>
        </div>
      </div>

      {consultas.length === 0 ? (
        <p className="text-sm text-tinta-tenue">{t('vacio')}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-borde">
          {consultas.map((consulta) => (
            <li key={consulta.id} className="py-3 first:pt-0 last:pb-0">
              {/*
                `<details>` nativo y no un acordeón de cliente: no hace falta
                JavaScript para abrir una respuesta guardada, y el navegador ya
                sabe hacerlo accesible.
              */}
              <details className="group">
                <summary className="flex cursor-pointer list-none flex-col gap-1 rounded-xl px-2 py-2 transition-colors hover:bg-fondo-hondo/60">
                  <time
                    dateTime={consulta.created_at}
                    className="text-[0.65rem] uppercase tracking-[0.18em] text-tinta-tenue"
                  >
                    {fechaYHora(consulta.created_at, idioma)}
                  </time>
                  <span className="flex items-start gap-2 text-sm leading-relaxed">
                    <Estrella className="mt-1 shrink-0 text-oro" />
                    <span>«{consulta.question}»</span>
                  </span>
                </summary>

                <div className="mt-2 flex flex-col gap-3 rounded-2xl border border-borde bg-oro-palido/40 px-5 py-4">
                  {consulta.answer ? (
                    consulta.answer.split(/\n{2,}/).map((parrafo, indice) => (
                      <p key={indice} className="text-sm leading-relaxed text-tinta-suave">
                        {parrafo}
                      </p>
                    ))
                  ) : (
                    <p className="text-sm italic text-tinta-tenue">{t('sinRespuesta')}</p>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  )
}
