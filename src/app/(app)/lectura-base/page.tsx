import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { idiomaActual, type Idioma } from '@/i18n/idioma'

import { CartaDescargable } from '@/components/chart/boton-descargar'
import { DoceCasas } from '@/components/chart/casas'
import { NatalChart } from '@/components/chart/natal-chart'
import { TablaPosiciones } from '@/components/chart/tabla-posiciones'
import { Contenedor } from '@/components/layout/contenedor'
import { AvisoPendiente, EncabezadoPagina } from '@/components/layout/encabezado-pagina'
import { Estrella } from '@/components/layout/estrella'
import { Tarjeta } from '@/components/layout/tarjeta'
import { AmpliarLectura } from '@/components/lectura/ampliar-lectura'
import { AnalisisCompleto } from '@/components/lectura/analisis-completo'
import { VersionesAnteriores } from '@/components/lectura/versiones-anteriores'
import type { Carta } from '@/lib/astrology/types'
import { AvisoIdioma } from '@/components/lectura/aviso-idioma'
import { lecturaEnIdioma } from '@/lib/lectura/portal'
import { SECCIONES_LECTURA, clavesQueFaltan, lecturaBaseSchema } from '@/lib/lectura/schemas'
import { createClient } from '@/lib/supabase/server'
import { fechaDeCalendario, horaDeReloj } from '@/lib/time/formato'

import { ampliarLecturaActual, traducirLecturaActual } from './actions'

/* Un párrafo largo del modelo se parte en dos o tres cortos para leer en
   pantalla: 85–90 palabras seguidas a 14 px era lo que Andrea vio. */
function parrafos(texto: string): string[] {
  const frases = texto.split(/(?<=[.!?…»])\s+(?=[A-ZÁÉÍÓÚÑ¿¡«])/)
  const bloques: string[] = []
  let actual = ''
  for (const frase of frases) {
    const candidato = actual ? `${actual} ${frase}` : frase
    if (candidato.length > 320 && actual) {
      bloques.push(actual)
      actual = frase
    } else {
      actual = candidato
    }
  }
  if (actual) bloques.push(actual)
  return bloques
}

export const metadata: Metadata = {
  title: 'Tu lectura base · Abundance Code',
}

/**
 * `ampliarLecturaActual()` se ejecuta dentro de esta ruta y llama al modelo.
 * Sin esto, el límite por defecto la cortaría a mitad. Ver la nota larga en
 * `generando/page.tsx`.
 */
export const maxDuration = 120

export default async function LecturaBasePage() {
  const supabase = await createClient()

  const { data: portal } = await supabase
    .from('portals')
    .select('id, full_name, birth_date, birth_time, birth_city, chart, base_reading')
    .maybeSingle()

  if (!portal?.birth_date) redirect('/onboarding')

  // Lecturas retiradas al corregir el nacimiento. Casi siempre ninguna.
  const { data: versiones } = await supabase
    .from('reading_versions')
    .select('*')
    .eq('portal_id', portal.id)
    .eq('kind', 'lectura')
    .order('archived_at', { ascending: false })

  const carta = portal.chart as Carta | null

  // Se valida lo que hay guardado: una lectura a medias no debe pintarse como
  // si estuviera completa.
  const lectura = lecturaBaseSchema.safeParse(portal.base_reading)
  const t = await getTranslations('lectura')
  const tNav = await getTranslations('nav')
  const tCarta = await getTranslations('carta')
  const idioma = await idiomaActual()

  /* Qué texto se enseña: el original si está en el idioma de la interfaz, la
     traducción guardada si la hay, o el original con el aviso para pedirla. */
  const version = lectura.success ? lecturaEnIdioma(lectura.data, idioma) : null
  const texto = version?.texto ?? (lectura.success ? lectura.data : null)
  const escritaEn = lectura.success ? (lectura.data.idioma ?? 'es') : idioma

  /*
    Las secciones que esta lectura tiene de verdad.

    Tres se añadieron el 23 de septiembre de 2026 y las lecturas anteriores no
    las traen. Se recorre lo que hay: enseñar el título de una sección vacía es
    justo el fallo que se corrigió en la activación.
  */
  const secciones = texto
    ? SECCIONES_LECTURA.filter(({ clave }) => {
        const contenido = texto[clave]
        return typeof contenido === 'string' && contenido.trim().length > 0
      })
    : []

  /* Lo que le falta a una lectura anterior a las secciones nuevas. */
  const faltan = lectura.success && carta ? clavesQueFaltan(lectura.data) : []

  /*
    Orden de la página (documento del 23 sept 2026): la carta primero y en
    tamaño equilibrado, después las doce casas explicadas, después la lectura,
    y al final el contexto técnico plegado.

    La rueda va limitada a `max-w-sm` a propósito: el documento pide «no hacer
    la carta gigante». A tamaño completo empujaba el primer párrafo de la
    lectura por debajo de la pantalla en cualquier portátil, que es lo contrario
    de lo que se compró.
  */
  const bloqueCarta = (
    <Tarjeta className="flex flex-col gap-6 p-8">
      {carta ? (
        <CartaDescargable
          nombreArchivo={`carta-natal-${portal.birth_date}`}
          cabecera={
            <DatosDeNacimiento portal={portal} idioma={idioma} etiqueta={tCarta('tuCartaNatal')} />
          }
        >
          <NatalChart carta={carta} className="mx-auto w-full max-w-sm" />
        </CartaDescargable>
      ) : (
        <>
          <DatosDeNacimiento portal={portal} idioma={idioma} etiqueta={tCarta('tuCartaNatal')} />
          <AvisoPendiente>{t('cartaPendiente')}</AvisoPendiente>
        </>
      )}
    </Tarjeta>
  )

  return (
    <Contenedor>
      <EncabezadoPagina
        titulo={t('titulo')}
        descripcion={t('descripcion')}
        volver={{ href: '/portal', texto: tNav('volverAlPortal') }}
      />

      {bloqueCarta}

      {carta ? <DoceCasas carta={carta} idioma={idioma} /> : null}

      {lectura.success && texto ? (
        <>
          {!version ? (
            <AvisoIdioma escritoEn={escritaEn} actual={idioma} traducir={traducirLecturaActual} />
          ) : !version.original ? (
            <p className="text-xs text-tinta-tenue">
              {t('traducidaAviso', { idioma: idioma === 'es' ? 'inglés' : 'Spanish', destino: idioma === 'es' ? 'español' : 'English' })}
            </p>
          ) : null}

          <Tarjeta className="bg-oro-palido/40">
            <h2 className="flex items-center gap-3 text-2xl font-light">
              <Estrella />
              {t('resumen')}
            </h2>
            <div className="mt-4 flex max-w-prose flex-col gap-3 text-lg leading-relaxed text-tinta-suave">
              {parrafos(texto.resumen).map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </Tarjeta>

          {/* Índice: cada elemento lleva a su sección. */}
          <nav aria-label={t('enEstaLectura')} className="rounded-2xl bg-oro-palido/40 px-5 py-4">
            <p className="text-[0.65rem] uppercase tracking-[0.18em] text-tinta-tenue">
              {t('enEstaLectura')}
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {secciones.map(({ clave }) => (
                <li key={clave}>
                  <a
                    href={`#${clave}`}
                    className="inline-block rounded-full border border-borde bg-superficie px-3 py-1.5 text-xs text-tinta-suave transition-colors hover:bg-fondo-hondo"
                  >
                    {t(`secciones.${clave}` as never)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Una columna de lectura, a 16 px: es texto para leer seguido, no tarjetas para comparar. */}
          <div className="flex flex-col gap-6">
            {secciones.map(({ clave }) => (
              <Tarjeta key={clave} id={clave} className="flex scroll-mt-24 flex-col gap-3">
                <h3 className="flex items-center gap-3 text-xl font-light">
                  <Estrella />
                  {t(`secciones.${clave}` as never)}
                </h3>
                <div className="flex max-w-prose flex-col gap-3 text-base leading-relaxed text-tinta-suave">
                  {parrafos(texto[clave] as string).map((p, i) => <p key={i}>{p}</p>)}
                </div>
              </Tarjeta>
            ))}
          </div>

          {faltan.length > 0 ? (
            <AmpliarLectura
              cuantas={faltan.length}
              titulos={faltan.map((clave) => t(`secciones.${clave}` as never))}
              ampliar={ampliarLecturaActual}
            />
          ) : null}

          {/*
            El contexto técnico, en un solo sitio y plegado.

            Antes eran dos desplegables seguidos —la tabla de posiciones en uno
            y el análisis en otro— que decían lo mismo con dos botones. Ahora la
            tabla vive dentro del análisis: es de dónde sale lo que el análisis
            cuenta.
          */}
          {texto.analisisCompleto || carta ? (
            <AnalisisCompleto texto={texto.analisisCompleto}>
              {carta ? <TablaPosiciones carta={carta} /> : null}
            </AnalisisCompleto>
          ) : null}

          <VersionesAnteriores versiones={versiones ?? []} kind="lectura" />
        </>
      ) : (
        <>
          <AvisoPendiente>{t('noGenerada')}</AvisoPendiente>

          {/*
            La salida del callejón.

            Esta pantalla anunciaba las secciones que tendría la lectura y no
            ofrecía ninguna forma de escribirla. Si la generación falló —una
            llamada al modelo que se cae, un minuto de mala suerte—, la persona
            se quedaba aquí para siempre leyendo que su lectura estaba en camino,
            sin nada que pulsar y sin que nada del portal enlazara de vuelta a
            `/generando`. Le pasó a una clienta real durante cuatro días.

            Solo se ofrece cuando ya hay carta: sin ella no hay nada que
            interpretar, y `/generando` la devolvería aquí de inmediato.
          */}
          {carta ? (
            <div className="flex justify-center">
              <Link
                href="/generando"
                className="rounded-full bg-oro px-8 py-3.5 font-medium text-white transition-colors hover:bg-oro-hondo"
              >
                {t('generarAhora')}
              </Link>
            </div>
          ) : null}

          <ul className="grid gap-3 md:grid-cols-2">
            {SECCIONES_LECTURA.map(({ clave }) => (
              <li
                key={clave}
                className="flex items-center gap-2 rounded-2xl border border-dashed border-borde-fuerte px-4 py-3 text-sm text-tinta-suave"
              >
                <Estrella className="text-oro-claro" />
                {t(`secciones.${clave}` as never)}
              </li>
            ))}
          </ul>
        </>
      )}
    </Contenedor>
  )
}

/** Nombre, fecha, hora y lugar: la cabecera de la tarjeta de la carta. */
function DatosDeNacimiento({
  portal,
  idioma,
  etiqueta,
}: {
  /** Ya traducida por la página: este componente no es asíncrono. */
  etiqueta: string
  idioma: Idioma
  portal: { full_name: string | null; birth_date: string | null; birth_time: string | null; birth_city: string | null }
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[0.65rem] uppercase tracking-[0.18em] text-tinta-tenue">
        {etiqueta}
      </p>
      <h2 className="text-2xl font-light">{portal.full_name}</h2>
      <p className="text-sm text-tinta-suave">
        {fechaDeCalendario(portal.birth_date, idioma)}
        {portal.birth_time ? ` · ${horaDeReloj(portal.birth_time)}` : ''} · {portal.birth_city}
      </p>
    </div>
  )
}
