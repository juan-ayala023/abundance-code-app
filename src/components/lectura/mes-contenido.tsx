import { CalendarDays, CircleAlert, Compass, Sparkles, Sun } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Insignia, Tarjeta } from '@/components/layout/tarjeta'
import type { Idioma } from '@/i18n/idioma'
import type { MesTexto } from '@/lib/lectura/schemas'

/**
 * La lectura del mes, con sus dieciséis apartados.
 *
 * El orden es el del documento del 23 de septiembre de 2026 y no es
 * decorativo: el mes se lee como una historia —qué empieza, qué pasa a mitad,
 * cómo se cierra— y las fechas van después, cuando ya se sabe de qué van.
 * Empezar por el calendario convertiría esto en una agenda.
 *
 * Ninguna fecha de esta pantalla la escribió el modelo: todas vienen del
 * cálculo y se pegaron por identificador al generar. Ver `generar-mes.ts`.
 */
export async function MesContenido({ texto, idioma }: { texto: MesTexto; idioma: Idioma }) {
  const t = await getTranslations('mes')

  const areas = [
    { clave: 'abundancia', texto: texto.abundancia },
    { clave: 'amor', texto: texto.amor },
    { clave: 'trabajo', texto: texto.trabajo },
    { clave: 'mundoEmocional', texto: texto.mundoEmocional },
  ] as const

  const tercios = [
    { clave: 'primeraParte', texto: texto.primeraParte },
    { clave: 'mitadDelMes', texto: texto.mitadDelMes },
    { clave: 'finalDelMes', texto: texto.finalDelMes },
  ] as const

  return (
    <>
      {/* 1 y 2. El tema del mes y lo que empieza a moverse. */}
      <Tarjeta className="flex flex-col gap-4 bg-oro-palido/40">
        <h2 className="flex items-start gap-3 text-2xl font-light leading-snug">
          <Sparkles size={20} className="mt-1.5 shrink-0 text-oro" aria-hidden="true" />
          {texto.titular}
        </h2>
        <div className="flex max-w-prose flex-col gap-3 leading-relaxed text-tinta-suave">
          <p>{texto.temaPrincipal}</p>
        </div>
      </Tarjeta>

      <Bloque titulo={t('queEmpiezaAMoverse')} cuerpo={texto.queEmpiezaAMoverse} />

      {/* 3, 4 y 5. El mes por tercios. */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-light">{t('comoAvanza')}</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {tercios.map(({ clave, texto: cuerpo }) => (
            <Tarjeta key={clave} className="flex flex-col gap-2">
              <h3 className="text-[0.7rem] uppercase tracking-[0.18em] text-tinta-tenue">
                {t(clave)}
              </h3>
              <p className="leading-relaxed text-tinta-suave">{cuerpo}</p>
            </Tarjeta>
          ))}
        </div>
      </section>

      {/* 6 a 9. Las cuatro áreas. */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-light">{t('porAreas')}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {areas.map(({ clave, texto: cuerpo }) => (
            <Tarjeta key={clave} className="flex flex-col gap-2">
              <h3 className="text-base font-medium">{t(clave)}</h3>
              <p className="leading-relaxed text-tinta-suave">{cuerpo}</p>
            </Tarjeta>
          ))}
        </div>
      </section>

      {/* 10. Las fechas importantes, con sus días calculados. */}
      {texto.diasImportantes.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-light">{t('diasImportantes')}</h2>

          {texto.diasImportantes.map((dia) => (
            <Tarjeta key={dia.id} className="flex flex-col gap-4">
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.18em] text-tinta-tenue">
                    <CalendarDays size={14} aria-hidden="true" />
                    {rangoLegible(dia.desde, dia.hasta, idioma)}
                  </p>
                  <h3 className="text-xl font-light">{dia.titular}</h3>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                    dia.nivel === 'alta'
                      ? 'bg-oro text-white'
                      : dia.nivel === 'media'
                        ? 'bg-oro-palido text-tinta'
                        : 'border border-borde text-tinta-suave'
                  }`}
                >
                  {t(`nivel.${dia.nivel}` as never)}
                </span>
              </header>

              <p className="max-w-prose leading-relaxed text-tinta-suave">{dia.texto}</p>

              <dl className="flex flex-col gap-3 rounded-2xl bg-fondo-hondo px-4 py-3 text-sm">
                <Dato etiqueta={t('senal')} valor={dia.senal} />
                <Dato etiqueta={t('favorece')} valor={dia.favorece} />
                <Dato etiqueta={t('cuidadoCon')} valor={dia.cuidadoCon} />
              </dl>
            </Tarjeta>
          ))}
        </section>
      ) : null}

      {/* 11 y 12. Los días sueltos. */}
      {texto.diasFavorables.length > 0 || texto.diasCuidado.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {texto.diasFavorables.length > 0 ? (
            <Tarjeta className="flex flex-col gap-4">
              <h2 className="flex items-center gap-3 text-lg font-light">
                <Sun size={18} className="text-oro" aria-hidden="true" />
                {t('diasFavorables')}
              </h2>
              <ul className="flex flex-col gap-4">
                {texto.diasFavorables.map((dia) => (
                  <li key={dia.id} className="flex flex-col gap-1">
                    <p className="text-sm font-medium">{fechaLegible(dia.fecha, idioma)}</p>
                    <p className="text-sm leading-relaxed text-tinta-suave">{dia.texto}</p>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          ) : null}

          {texto.diasCuidado.length > 0 ? (
            <Tarjeta className="flex flex-col gap-4">
              <h2 className="flex items-center gap-3 text-lg font-light">
                <CircleAlert size={18} className="text-oro-hondo" aria-hidden="true" />
                {t('diasCuidado')}
              </h2>
              <ul className="flex flex-col gap-4">
                {texto.diasCuidado.map((dia) => (
                  <li key={dia.id} className="flex flex-col gap-1">
                    <p className="text-sm font-medium">{fechaLegible(dia.fecha, idioma)}</p>
                    <p className="text-sm leading-relaxed text-tinta-suave">{dia.texto}</p>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          ) : null}
        </div>
      ) : null}

      {/* 13, 14 y 15. */}
      <Bloque titulo={t('patronKarmico')} cuerpo={texto.patronKarmico} />

      <div className="grid gap-4 md:grid-cols-2">
        <Tarjeta className="flex flex-col gap-2">
          <h2 className="text-base font-medium">{t('oportunidad')}</h2>
          <p className="leading-relaxed text-tinta-suave">{texto.oportunidad}</p>
        </Tarjeta>
        <Tarjeta className="flex flex-col gap-2">
          <h2 className="text-base font-medium">{t('advertencia')}</h2>
          <p className="leading-relaxed text-tinta-suave">{texto.advertencia}</p>
        </Tarjeta>
      </div>

      {/* 16. Con qué se queda. */}
      <Tarjeta className="flex gap-4 bg-oro-palido/40">
        <Insignia Icono={Compass} />
        <div className="flex min-w-0 flex-col gap-3">
          <h2 className="text-lg font-light">{t('tresAcciones')}</h2>
          <ol className="flex flex-col gap-2">
            {texto.tresAcciones.map((accion, i) => (
              <li key={i} className="flex gap-3 leading-relaxed text-tinta-suave">
                <span className="mt-0.5 shrink-0 text-xs text-oro-hondo">{i + 1}</span>
                <span>{accion}</span>
              </li>
            ))}
          </ol>
        </div>
      </Tarjeta>

      <p className="text-center text-xs leading-relaxed text-tinta-tenue">{t('aviso')}</p>
    </>
  )
}

function Bloque({ titulo, cuerpo }: { titulo: string; cuerpo: string }) {
  return (
    <Tarjeta className="flex flex-col gap-2">
      <h2 className="text-lg font-light">{titulo}</h2>
      <p className="max-w-prose leading-relaxed text-tinta-suave">{cuerpo}</p>
    </Tarjeta>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
      <dt className="shrink-0 font-medium">{etiqueta}</dt>
      <dd className="leading-relaxed text-tinta-suave">{valor}</dd>
    </div>
  )
}

/** «12 de octubre». Fecha de calendario: se lee en UTC a propósito. */
function fechaLegible(iso: string, idioma: Idioma): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(idioma, {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
}

/** «12 – 14 de octubre», o un solo día si la ventana dura uno. */
function rangoLegible(desde: string, hasta: string, idioma: Idioma): string {
  if (desde === hasta) return fechaLegible(desde, idioma)

  const mismoMes = desde.slice(0, 7) === hasta.slice(0, 7)
  const inicio = mismoMes
    ? new Date(`${desde}T12:00:00Z`).toLocaleDateString(idioma, { day: 'numeric', timeZone: 'UTC' })
    : fechaLegible(desde, idioma)

  return `${inicio} – ${fechaLegible(hasta, idioma)}`
}
