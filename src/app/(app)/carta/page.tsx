import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'

import { NatalChart } from '@/components/chart/natal-chart'
import { TablaPosiciones } from '@/components/chart/tabla-posiciones'
import { Contenedor } from '@/components/layout/contenedor'
import { AvisoPendiente } from '@/components/layout/encabezado-pagina'
import { Tarjeta } from '@/components/layout/tarjeta'
import { RetratoDeCarta } from '@/components/lectura/retrato'
import { entitlementDe, resolveAccess } from '@/lib/access/entitlement'
import { nivelDeAcceso } from '@/lib/access/nivel'
import { asegurarCarta, COLUMNAS_CARTA } from '@/lib/astrology/portal'
import type { Carta } from '@/lib/astrology/types'
import {
  asegurarRetrato,
  COLUMNAS_RETRATO,
  type PortalParaRetrato,
} from '@/lib/lectura/retrato'
import { retratoSchema } from '@/lib/lectura/schemas'
import { createClient } from '@/lib/supabase/server'

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

  return (
    <Contenedor>
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-light leading-tight tracking-tight lg:text-5xl">
          {t('titulo')}
        </h1>
        <p className="text-sm opacity-70">
          {portal.birth_city} · {portal.birth_date}
        </p>
      </header>

      {carta ? (
        <>
          <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <NatalChart carta={carta} />
            <TablaPosiciones carta={carta} />
          </div>

          {carta.precision === 'partial' && <AvisoSinHora />}

          {/*
            El retrato ya escrito se pinta directamente; el que hay que escribir
            va detrás de un `<Suspense>`. La distinción importa en las dos
            direcciones.

            Hay que escribirlo la primera vez, y eso tarda más de un minuto. Sin
            el límite, esa espera se la comería la página entera: quien abre su
            carta vería el navegador girando durante minuto y medio sin ver nada
            —ni la rueda, ni la tabla—, y lo normal es que se marchara antes.

            Pero envolverlo SIEMPRE tampoco vale. Un componente asíncrono se
            suspende aunque no tenga nada que esperar, así que quien ya tiene su
            retrato guardado —o sea, todo el mundo a partir de la segunda
            visita— recibiría primero los diez recuadros del esqueleto y luego el
            texto. Un parpadeo de carga donde no se está cargando nada se lee
            como que la página va mal.
          */}
          {retratoGuardado.success ? (
            <RetratoDeCarta retrato={retratoGuardado.data} carta={carta} />
          ) : (
            <Suspense fallback={<RetratoPendiente />}>
              <SeccionRetrato portal={portal} carta={carta} />
            </Suspense>
          )}
        </>
      ) : (
        <NoSePudoCalcular />
      )}
    </Contenedor>
  )
}

/**
 * El retrato que todavía hay que escribir.
 *
 * Solo se monta cuando no hay ninguno guardado: el que ya existe lo pinta la
 * página directamente. Va en su propio componente asíncrono porque es lo que
 * `<Suspense>` necesita para enseñar el resto de la pantalla mientras esto
 * tarda — el límite suspende a su hijo, no a su hermano.
 */
async function SeccionRetrato({
  portal,
  carta,
}: {
  portal: PortalParaRetrato
  carta: Carta
}) {
  const t = await getTranslations('retrato')

  /*
   * El nivel se comprueba ANTES de generar, igual que en `/activacion`: escribir
   * un retrato que no se va a enseñar costaría dinero para nada.
   *
   * Nótese que quien ya tiene el suyo escrito **no pasa por aquí**, y eso es
   * deliberado: lo que la persona ya leyó no se le retira aunque se dé de baja.
   * Es la misma regla que protege la lectura base en `nivel.ts`.
   */
  const acceso = await resolveAccess()
  if (nivelDeAcceso(entitlementDe(acceso)) === 'solo-lectura') {
    return <AvisoPendiente>{t('requiereSuscripcion')}</AvisoPendiente>
  }

  const supabase = await createClient()
  const retrato = await asegurarRetrato(supabase, portal)

  if (!retrato) return <AvisoPendiente>{t('noDisponible')}</AvisoPendiente>

  return <RetratoDeCarta retrato={retrato} carta={carta} />
}

/** Lo que se ve mientras el retrato se escribe, la primera vez. */
async function RetratoPendiente() {
  const t = await getTranslations('retrato')

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-3xl font-light tracking-tight lg:text-4xl">{t('titulo')}</h2>

      <AvisoPendiente>{t('pendiente')}</AvisoPendiente>

      {/*
        Diez recuadros vacíos con la forma que van a tener las tarjetas. No es
        adorno: sin ellos la página da un salto de un aviso de tres líneas a diez
        tarjetas de texto, y quien estaba leyendo la tabla de arriba pierde el
        sitio. `motion-safe` porque un pulso continuo molesta a quien ha pedido
        menos movimiento.
      */}
      <div aria-hidden="true" className="grid gap-5 md:grid-cols-2">
        {Array.from({ length: 10 }, (_, indice) => (
          <Tarjeta key={indice} className="h-44 motion-safe:animate-pulse" />
        ))}
      </div>
    </section>
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
          <Link href="/onboarding" className="underline underline-offset-4">
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
        <Link href="/onboarding" className="text-sm underline underline-offset-4">
          {t('revisarDatos')}
        </Link>
        <Link href="/portal" className="text-sm underline underline-offset-4">
          {tNav('volverAlPortal')}
        </Link>
      </div>
    </>
  )
}
