import { Compass, MessageCircle, Sparkles, Sun } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { CieloDeHoy } from '@/components/chart/cielo-de-hoy'
import { Equilibrio } from '@/components/chart/equilibrio'
import { NatalChart } from '@/components/chart/natal-chart'
import { TrioPrincipal } from '@/components/chart/trio-principal'
import { Contenedor } from '@/components/layout/contenedor'
import { AreasDesbloqueadas } from '@/components/layout/areas-desbloqueadas'
import { IndicadorCiclo } from '@/components/layout/indicador-ciclo'
import { Tarjeta, TarjetaAccion } from '@/components/layout/tarjeta'
import { asegurarCarta, COLUMNAS_CARTA } from '@/lib/astrology/portal'
import { diaDelCiclo } from '@/lib/lectura/ciclo'
import { lecturaBaseSchema } from '@/lib/lectura/schemas'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Tu portal · Abundance Code',
}

export default async function PortalPage() {
  const supabase = await createClient()

  const [{ data: perfil }, { data: portal }] = await Promise.all([
    supabase.from('profiles').select('full_name').maybeSingle(),
    supabase
      .from('portals')
      // `COLUMNAS_CARTA` ya trae `birth_date` y `chart`: son las que necesita
      // `asegurarCarta` para no recalcular lo que ya está guardado.
      .select(`${COLUMNAS_CARTA}, base_reading, created_at`)
      .maybeSingle(),
  ])

  const nombre = (perfil?.full_name ?? '').split(' ')[0] ?? ''
  const tieneDatos = Boolean(portal?.birth_date)
  const ciclo = diaDelCiclo(portal?.created_at)

  /*
   * La misma llamada que usa `/carta`, y por la misma razón: lee la carta
   * guardada y solo la calcula si falta o si la calculó una versión anterior
   * del motor. El cálculo es local —no hay proveedor externo de por medio—, así
   * que en el peor caso cuesta unos milisegundos, y solo la primera vez.
   *
   * Devuelve `null` sin lanzar cuando no hay datos de nacimiento con los que
   * calcular, que es justo el caso de quien todavía no ha hecho el onboarding.
   */
  const carta = portal ? await asegurarCarta(supabase, portal) : null

  /*
   * ¿Tiene datos pero no tiene lectura? Entonces la generación falló, y hay que
   * decírselo AQUÍ.
   *
   * Le pasó a una clienta: su lectura falló al escribirse y estuvo cuatro días
   * entrando a un portal que no le decía nada. La forma de reintentarlo está en
   * Lectura Base, pero nadie entra ahí a buscar un botón que no sabe que existe.
   * Esta pantalla es la primera que ve, así que es donde tiene que enterarse.
   *
   * `lecturaBaseSchema` y no `Boolean(base_reading)`: una lectura guardada a
   * medias —que ha pasado— no debe contar como lectura, porque la pantalla que
   * la pinta tampoco la aceptaría y la persona seguiría sin nada.
   */
  const faltaLectura =
    tieneDatos && !lecturaBaseSchema.safeParse(portal?.base_reading).success

  const t = await getTranslations('portal')

  return (
    <Contenedor>
      <div className="flex items-start justify-between gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-4xl font-light tracking-tight lg:text-5xl">
            {nombre ? t('bienvenidaConNombre', { nombre }) : t('bienvenida')}
          </h1>
          <p className="text-tinta-suave">
            {t('subtitulo')}
          </p>
        </header>

        {ciclo ? (
          <div className="hidden pt-4 lg:block">
            <IndicadorCiclo progreso={ciclo.progreso} />
          </div>
        ) : null}
      </div>

      {!tieneDatos ? (
        <TarjetaAccion
          Icono={Compass}
          sobretitulo={t('primerPaso')}
          titulo={t('completaDatos')}
          descripcion={t('completaDatosTexto')}
          href="/onboarding"
          accion={t('empezar')}
        />
      ) : null}

      {faltaLectura ? (
        <TarjetaAccion
          Icono={Sparkles}
          sobretitulo={t('faltaLecturaSobre')}
          titulo={t('faltaLectura')}
          descripcion={t('faltaLecturaTexto')}
          href="/generando"
          accion={t('faltaLecturaAccion')}
        />
      ) : null}

      {/*
        En este hueco estaba la tarjeta «Portal activo · Día N de 30», con su
        barra de progreso y su porcentaje. Se llevó a Mi Cuenta a petición del
        cliente, y la razón importa para no reponerla sin querer: puesta en la
        primera pantalla, y siendo lo único con un número grande y una barra que
        avanza, convertía el portal en una cuenta atrás. Quien entraba a leer su
        lectura acababa mirando cuántos días le quedaban. El dato sigue estando,
        en Mi Cuenta, que es donde se consulta el estado de lo contratado.

        Lo que ocupa ahora su lugar son las dos cosas de esta pantalla que son
        suyas y de nadie más: el cielo de hoy sobre su carta, y su carta.

        **El cielo va primero, y el orden es la decisión.** En un teléfono solo
        se ve lo primero sin desplazar, así que lo primero debería ser lo que
        cambia. La rueda es la misma todos los días —es su carta de nacimiento— y
        en la tercera visita ya no dice nada nuevo; los tránsitos son distintos
        hoy que ayer. Eso es lo que hace que volver mañana tenga sentido, y por
        una razón astrológica en vez de por una notificación.

        No cuesta una llamada al modelo: es el cielo real calculado en local, el
        mismo que ya se usaba para escribir la activación del día.
      */}
      {carta ? <CieloDeHoy carta={carta} /> : null}

      {carta ? (
        <Tarjeta
          className={cn(
            'flex flex-col items-center gap-5 sm:gap-7',
            /*
              En el teléfono va a sangre, y esto no es un capricho de estilo.
              Con el margen del contenedor (`px-4`) más el relleno de la tarjeta
              (`p-5`), a la rueda le quedaban 318 px de los 390 de una pantalla
              corriente: el 18 % de la anchura se iba en aire, y en un dibujo
              circular la anchura perdida se paga al cuadrado. `-mx-4` le
              devuelve el margen del contenedor y `px-2` deja el relleno en lo
              mínimo para que la rueda no toque el borde del cristal.

              Se quitan también el redondeo y los bordes laterales: una tarjeta
              a sangre con las esquinas redondeadas se ve cortada, no ancha.
            */
            '-mx-4 rounded-none border-x-0 px-2',
            // Desde `sm` sobra el ancho, así que vuelve a ser una tarjeta normal.
            'sm:mx-0 sm:rounded-3xl sm:border-x sm:px-7',
            /*
              En escritorio, rueda y trío uno al lado del otro, y el conjunto
              centrado. Apilados dejaban una rueda de 544 px sobre tres líneas de
              texto y medio ancho de tarjeta vacío; en fila, la rueda puede
              encogerse —que es lo que se pidió— sin que la tarjeta se quede
              coja, porque el trío ocupa el hueco que deja.
            */
            'lg:flex-row lg:items-center lg:justify-center lg:gap-14',
          )}
        >
          {/*
            Dos topes distintos y por dos razones distintas.

            En el teléfono manda `w-full`: ahí la rueda tiene que ser lo más
            grande que quepa, y el tope de 34 rem no llega a aplicarse nunca.

            En escritorio se fija en 24 rem. Antes ocupaba los 34 y salía
            desproporcionada: era, con diferencia, lo más grande de la pantalla y
            empujaba el resto del portal por debajo del pliegue.
          */}
          <NatalChart
            carta={carta}
            className="w-full max-w-136 lg:w-96 lg:max-w-none lg:shrink-0"
          />

          {/*
            `px-3` solo por debajo de `sm`: la tarjeta va a sangre con `px-2`,
            que está bien para un dibujo pero deja el texto pegado al borde del
            cristal.
          */}
          <div className="flex w-full flex-col gap-5 px-3 sm:gap-6 sm:px-0 lg:w-72">
            <TrioPrincipal carta={carta} />

            {/*
              El equilibrio va debajo del trío y no en otra tarjeta: los dos
              contestan a «cómo es esta carta», y separarlos obligaría a
              desplazar entre una pregunta y su segunda mitad.
            */}
            <Equilibrio carta={carta} />

            <Link
              href="/carta"
              className="text-center text-sm font-medium text-oro-hondo underline-offset-4 hover:underline lg:text-left"
            >
              {t('verCartaCompleta')} →
            </Link>
          </div>
        </Tarjeta>
      ) : null}

      {/*
        Aquí estaba «Tu Patrón Central», que sacaba el resumen de la lectura
        base. Se quitó a petición del cliente.

        Las dos filas de tarjetas que quedaban se han juntado en una de tres. Con
        la tarjeta fuera, la primera fila se quedaba con un solo elemento en una
        rejilla de dos columnas: media fila vacía a la derecha, que se lee como
        algo que no cargó y no como una decisión.
      */}
      <div className="grid gap-5 lg:grid-cols-3">
        <TarjetaAccion
          Icono={Compass}
          titulo={t('codigoNatal')}
          descripcion={t('codigoNatalTexto')}
          href={tieneDatos ? '/carta' : undefined}
          accion={tieneDatos ? t('verLectura') : undefined}
          pendiente={
            tieneDatos ? undefined : t('trasDatos')
          }
        />

        {/*
          El título decía «Activación del Día 13». Sin número, por el mismo
          motivo que en `/activacion`: el día se cuenta por dentro, no se enseña.
        */}
        <TarjetaAccion
          Icono={Sun}
          sobretitulo={t('activacionHoy')}
          titulo={t('activacionTitulo')}
          descripcion={t('activacionTexto')}
          href={tieneDatos ? '/activacion' : undefined}
          accion={tieneDatos ? t('leerActivacion') : undefined}
          pendiente={tieneDatos ? undefined : t('trasDatosCorto')}
        />

        <TarjetaAccion
          Icono={MessageCircle}
          titulo={t('guia')}
          descripcion={t('guiaTexto')}
          href={tieneDatos ? '/guia' : undefined}
          accion={tieneDatos ? t('hacerPregunta') : undefined}
          pendiente={tieneDatos ? undefined : t('trasDatosCorto')}
        />
      </div>

      <AreasDesbloqueadas carta={carta} />

      <p className="py-4 text-center text-sm italic text-tinta-suave">
        {t('cierre')}
      </p>
    </Contenedor>
  )
}
