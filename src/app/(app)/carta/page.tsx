import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { idiomaActual } from '@/i18n/idioma'

import { NatalChart } from '@/components/chart/natal-chart'
import { TablaPosiciones } from '@/components/chart/tabla-posiciones'
import { Contenedor } from '@/components/layout/contenedor'
import { AvisoIdioma } from '@/components/lectura/aviso-idioma'
import { RetratoDeCarta } from '@/components/lectura/retrato'
import { RetratoGeneracion } from '@/components/lectura/retrato-generacion'
import { traducirRetratoActual } from './actions'
import { VersionesAnteriores } from '@/components/lectura/versiones-anteriores'
import { asegurarCarta, COLUMNAS_CARTA } from '@/lib/astrology/portal'
import {
  retratoEnIdioma,
  COLUMNAS_RETRATO,
} from '@/lib/lectura/retrato'
import { retratoSchema } from '@/lib/lectura/schemas'
import { createClient } from '@/lib/supabase/server'
import { fechaDeCalendario } from '@/lib/time/formato'

/**
 * El retrato se escribe durante el render la primera vez que alguien abre su
 * carta: son diez secciones de unas cien palabras, más de un minuto medido.
 * Está declarado por lo mismo que `generando/page.tsx` —fuera de Vercel se
 * ignora, pero documenta cuánto tarda de verdad y protege si algún día esto se
 * mueve a una plataforma que corte las peticiones.
 *
 * Lo que hace que la espera no se note es el `<Suspense>` de abajo, no este
 * número: la rueda se pinta enseguida y el retrato llega después.
 */
export const maxDuration = 300

export const metadata: Metadata = {
  title: 'Tu carta natal · Abundance Code',
}

export default async function CartaPage() {
  const t = await getTranslations('carta')
  const idioma = await idiomaActual()
  const supabase = await createClient()

  const { data: portal, error } = await supabase
    .from('portals')
    .select(`${COLUMNAS_CARTA}, ${COLUMNAS_RETRATO}, birth_city`)
    .maybeSingle()

  /*
   * Si la consulta falla, se lanza; no se sigue como si el portal no existiera.
   *
   * Antes el error se descartaba y solo quedaba `data: null`, que es
   * indistinguible de «esta persona no ha rellenado sus datos». El resultado era
   * que cualquier fallo de lectura —una columna que falta porque la migración no
   * se aplicó, un permiso mal puesto— mandaba al usuario al onboarding en
   * silencio, a rellenar unos datos que ya tenía. Pasó exactamente eso, y
   * diagnosticarlo costó bastante más de lo que habría costado leer el error.
   *
   * Lanzar es lo correcto y no lo cómodo: una consulta rota es un fallo del
   * programa, no un estado del usuario, y aquí se ve como tal.
   */
  if (error) {
    /*
     * Los campos se sacan uno a uno en vez de volcar el objeto entero. El error
     * de PostgREST no se serializa: `console.error('...', error)` imprime `{}`
     * tanto en la consola como en el panel de errores de Next, y el mensaje
     * —que es justo el único dato que hace falta— se pierde por el camino.
     */
    console.error('[carta] no se pudo leer el portal', {
      mensaje: error.message,
      codigo: error.code,
      detalles: error.details,
      pista: error.hint,
    })

    throw new Error(`No se pudo leer el portal: ${error.message}`)
  }

  // Sin datos de nacimiento no hay nada que dibujar.
  if (!portal?.birth_date) redirect('/onboarding')

  // Calcula y guarda la primera vez; después solo lee.
  const carta = await asegurarCarta(supabase, portal)

  // Se mira aquí, y no dentro de `SeccionRetrato`, porque de esto depende si
  // hace falta un límite de suspensión. Ver el comentario de abajo.
  const retratoGuardado = retratoSchema.safeParse(portal.chart_reading)

  // Retratos retirados al corregir el nacimiento. Casi siempre ninguno.
  const { data: versiones } = await supabase
    .from('reading_versions')
    .select('*')
    .eq('portal_id', portal.id)
    .eq('kind', 'retrato')
    .order('archived_at', { ascending: false })

  return (
    <Contenedor>
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-light leading-tight tracking-tight lg:text-5xl">
          {t('titulo')}
        </h1>
        <p className="text-sm opacity-70">
          {portal.birth_city} · {fechaDeCalendario(portal.birth_date, idioma)}
        </p>
      </header>

      {carta ? (
        <>
          <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <NatalChart carta={carta} />
            <TablaPosiciones carta={carta} />
          </div>

          {carta.precision === 'partial' && <AvisoSinHora />}

          {/* El retrato guardado se pinta; el que falta se escribe a petición del
              cliente (RetratoGeneracion), no durante el render. */}
          {retratoGuardado.success ? (
            (() => {
              const version = retratoEnIdioma(retratoGuardado.data, idioma)
              return (
                <>
                  {!version ? (
                    <AvisoIdioma
                      escritoEn={retratoGuardado.data.idioma ?? 'es'}
                      actual={idioma}
                      traducir={traducirRetratoActual}
                    />
                  ) : null}
                  <RetratoDeCarta retrato={version?.texto ?? retratoGuardado.data} carta={carta} />
                </>
              )
            })()
          ) : (
            /* Se escribe a petición del cliente, no durante el render: ver
               `escribirRetrato` en ./actions.ts. */
            <RetratoGeneracion />
          )}

          <VersionesAnteriores versiones={versiones ?? []} kind="retrato" />
        </>
      ) : (
        <NoSePudoCalcular />
      )}
    </Contenedor>
  )
}


/**
 * Sin hora de nacimiento la carta existe, pero le faltan las casas, el
 * ascendente y el medio cielo. Decirlo aquí evita que se lea como una carta
 * completa a la que le sobra espacio.
 */
async function AvisoSinHora() {
  const t = await getTranslations('carta')

  return (
    <p
      role="note"
      className="rounded-2xl border border-oro-claro bg-oro-palido/60 px-4 py-3 text-sm"
    >
      {/*
        `t.rich` y no una cadena partida en tres: el aviso lleva una negrita y un
        enlace en medio de la frase, y en inglés no caen en el mismo sitio.
        Trocear el texto por las etiquetas obligaría al traductor a respetar un
        orden de palabras que su idioma no tiene.
      */}
      {t.rich('sinHoraAviso', {
        b: (trozo) => <strong>{trozo}</strong>,
        enlace: (trozo) => (
          <Link href="/onboarding?editar=1" className="underline underline-offset-4">
            {trozo}
          </Link>
        ),
      })}
    </p>
  )
}

/**
 * El cálculo falló. No se enseña una carta de muestra en su lugar: en un
 * producto cuyo entregable es una interpretación personal, unas posiciones
 * inventadas pueden confundirse con las propias.
 */
async function NoSePudoCalcular() {
  const t = await getTranslations('carta')
  const tNav = await getTranslations('nav')

  return (
    <>
      <div
        role="status"
        className="rounded-2xl border border-oro-claro bg-oro-palido/60 px-4 py-3 text-sm"
      >
        {t.rich('noCalculada', { b: (trozo) => <strong>{trozo}</strong> })}
      </div>

      <div className="flex flex-col gap-3">
        <Link href="/onboarding?editar=1" className="text-sm underline underline-offset-4">
          {t('revisarDatos')}
        </Link>
        <Link href="/portal" className="text-sm underline underline-offset-4">
          {tNav('volverAlPortal')}
        </Link>
      </div>
    </>
  )
}
