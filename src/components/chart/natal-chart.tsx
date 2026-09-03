import { getTranslations } from 'next-intl/server'

import {
  anguloEnPantalla,
  distribuir,
  normalizar,
  punto,
} from '@/lib/astrology/geometria'
import type { Carta } from '@/lib/astrology/types'
import { SIGNOS, signoDe } from '@/lib/astrology/types'

import {
  COLOR_ASPECTO,
  COLOR_CUERPO,
  COLOR_EJE,
  COLOR_ELEMENTO_GLIFO,
  COLOR_TRAZO_CASA,
  COLOR_TRAZO_RUEDA,
  ELEMENTO_SIGNO,
  GLIFO_CUERPO,
  GLIFO_SIGNO,
} from './glifos'

/**
 * Rueda natal en SVG (CLAUDE.md §2).
 *
 * SVG y no canvas: tiene que ser nítida a cualquier tamaño, exportable a
 * PNG/PDF y legible por un lector de pantalla. Una imagen generada por un
 * tercero no da ninguna de las tres cosas.
 *
 * Se renderiza en el servidor y no tiene estado: recibe la carta ya calculada
 * y la dibuja.
 *
 * El aspecto es el de la carta astrológica impresa de toda la vida —disco
 * blanco, corona de signos dividida en doce, escala de grados colgando hacia
 * dentro y glifos coloreados por elemento y por planeta— y no el de un gráfico
 * de marca. Es lo que se reconoce de un vistazo como «una carta natal»: los
 * sectores teñidos en pastel que había antes eran más bonitos de lejos, pero de
 * cerca competían con lo único que hay que leer, que son los símbolos y las
 * líneas.
 */

const LADO = 800
const C = LADO / 2

/*
 * Radios, de fuera hacia dentro. Todo el dibujo se cuelga de estos nueve
 * números: tocar uno recoloca su anillo entero y nada más.
 */
const R_DISCO = 398
const R_BORDE = 390
const R_SIGNOS_INT = 306
const R_MARCA_PLANETA = 288
const R_PLANETAS = 244
const R_CASAS_EXT = 190
const R_NUMERO_CASA = 168
const R_CASAS_INT = 146

/** Centro de la corona de signos: ahí va el glifo, dentro de su sector. */
const R_GLIFO_SIGNO = (R_BORDE + R_SIGNOS_INT) / 2

/** Separación mínima entre glifos de planeta, en grados. */
const SEPARACION_GLIFOS = 9

export async function NatalChart({ carta, className }: { carta: Carta; className?: string }) {
  const t = await getTranslations('rueda')
  const tCuerpos = await getTranslations('cuerpos')
  const tSignos = await getTranslations('signos')

  const asc = carta.ascendente
  const parcial = carta.precision === 'partial'

  const anguloDe = (longitud: number) => anguloEnPantalla(longitud, asc)
  const p = (radio: number, longitud: number) => punto(C, C, radio, anguloDe(longitud))

  // Posiciones de dibujo de los glifos, separadas para que un cúmulo no se
  // convierta en un borrón. La posición real se sigue marcando aparte.
  const longitudesDibujo = distribuir(
    carta.planetas.map((planeta) => planeta.longitud),
    SEPARACION_GLIFOS,
  )

  /*
   * Las marcas de grado van en tres trazados y no en 360 elementos `<line>`.
   * Es una vuelta completa al círculo grado a grado: en nodos sueltos engorda
   * el HTML del servidor decenas de kilobytes, y ese mismo SVG se vuelve a
   * serializar entero al exportar el PNG.
   */
  const marcas = (paso: number, largo: number, saltar: number) =>
    Array.from({ length: 360 / paso }, (_, i) => i * paso)
      .filter((grado) => grado % saltar !== 0)
      .map((grado) => {
        const fuera = p(R_SIGNOS_INT, grado)
        const dentro = p(R_SIGNOS_INT - largo, grado)
        return `M ${r1(fuera.x)} ${r1(fuera.y)} L ${r1(dentro.x)} ${r1(dentro.y)}`
      })
      .join(' ')

  return (
    <figure className={className}>
      <svg
        viewBox={`0 0 ${LADO} ${LADO}`}
        className="h-auto w-full"
        role="img"
        aria-labelledby="carta-titulo carta-desc"
      >
        {/*
          Esto es lo único de la rueda que se lee en voz alta, y estaba solo en
          español. Un comprador inglés con lector de pantalla recibía la app
          entera traducida y el dibujo —que es el producto— descrito en un idioma
          que no entiende.
        */}
        <title id="carta-titulo">{t('titulo')}</title>
        <desc id="carta-desc">
          {parcial
            ? t('descripcionParcial', { planetas: carta.planetas.length })
            : t('descripcionExacta', { planetas: carta.planetas.length })}
        </desc>

        {/*
          Disco claro propio en vez de dejar ver el crema de la página. La carta
          se lee como un instrumento apoyado encima, y los rojos y verdes de los
          glifos mantienen el contraste con el que se eligieron.
        */}
        <circle cx={C} cy={C} r={R_DISCO} fill="var(--color-superficie)" />

        {/*
          Escala de grados colgando hacia dentro de la corona: cada 1°, más
          largas cada 5 y cada 10.
        */}
        <g stroke={COLOR_TRAZO_RUEDA} fill="none">
          <path d={marcas(1, 7, 5)} strokeWidth={0.8} strokeOpacity={0.7} />
          <path d={marcas(5, 12, 10)} strokeWidth={0.9} strokeOpacity={0.85} />
          <path d={marcas(10, 17, 30)} strokeWidth={1} />
        </g>

        {/* Círculos guía */}
        {[
          { radio: R_BORDE, ancho: 1.6 },
          { radio: R_SIGNOS_INT, ancho: 1.6 },
          { radio: R_CASAS_EXT, ancho: 1 },
          { radio: R_CASAS_INT, ancho: 1 },
        ].map(({ radio, ancho }) => (
          <circle
            key={`circulo-${radio}`}
            cx={C}
            cy={C}
            r={radio}
            fill="none"
            stroke={COLOR_TRAZO_RUEDA}
            strokeWidth={ancho}
          />
        ))}

        {/* Divisiones entre signos: parten la corona en doce sectores */}
        {SIGNOS.map((signo, indice) => {
          const interior = p(R_SIGNOS_INT, indice * 30)
          const exterior = p(R_BORDE, indice * 30)
          return (
            <line
              key={`division-${signo}`}
              x1={interior.x}
              y1={interior.y}
              x2={exterior.x}
              y2={exterior.y}
              stroke={COLOR_TRAZO_RUEDA}
              strokeWidth={1.2}
            />
          )
        })}

        {/* Glifos de los signos, dentro de la corona y con el color de su elemento */}
        {SIGNOS.map((signo, indice) => {
          const centro = p(R_GLIFO_SIGNO, indice * 30 + 15)
          return (
            <text
              key={`glifo-${signo}`}
              x={centro.x}
              y={centro.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={38}
              fill={COLOR_ELEMENTO_GLIFO[ELEMENTO_SIGNO[signo]]}
            >
              <title>{tSignos(signo)}</title>
              {GLIFO_SIGNO[signo]}
            </text>
          )
        })}

        {/* Casas: solo si se conoce la hora */}
        {!parcial && carta.cuspides.length === 12 ? <Casas carta={carta} p={p} /> : null}

        {/* Aspectos, en el disco central */}
        <g>
          {carta.aspectos.map((aspecto, indice) => {
            const a = carta.planetas.find((x) => x.cuerpo === aspecto.a)
            const b = carta.planetas.find((x) => x.cuerpo === aspecto.b)
            if (!a || !b) return null

            const desde = p(R_CASAS_INT, a.longitud)
            const hasta = p(R_CASAS_INT, b.longitud)

            return (
              <line
                key={`aspecto-${indice}`}
                x1={desde.x}
                y1={desde.y}
                x2={hasta.x}
                y2={hasta.y}
                stroke={COLOR_ASPECTO[aspecto.tipo]}
                strokeOpacity={0.85}
                strokeWidth={aspecto.tipo === 'conjuncion' ? 1 : 1.4}
              />
            )
          })}
        </g>

        {/*
          Ejes al final, encima de los aspectos: son la estructura de la carta,
          no una línea más del enredo del centro.
        */}
        {!parcial ? <Ejes carta={carta} p={p} anguloDe={anguloDe} t={t} /> : null}

        {/* Planetas */}
        {carta.planetas.map((planeta, indice) => {
          const longitudDibujo = longitudesDibujo[indice] ?? planeta.longitud
          const glifo = p(R_PLANETAS, longitudDibujo)

          // La marca va en la longitud REAL: el glifo puede estar desplazado
          // para que se lea, pero la posición verdadera no se falsea.
          const marcaFuera = p(R_MARCA_PLANETA, planeta.longitud)
          const marcaDentro = p(R_MARCA_PLANETA - 11, planeta.longitud)
          const conector = p(R_PLANETAS + 17, longitudDibujo)

          const color = COLOR_CUERPO[planeta.cuerpo]

          return (
            <g key={planeta.cuerpo}>
              <line
                x1={marcaFuera.x}
                y1={marcaFuera.y}
                x2={marcaDentro.x}
                y2={marcaDentro.y}
                stroke={color}
                strokeWidth={1.6}
              />
              <line
                x1={marcaDentro.x}
                y1={marcaDentro.y}
                x2={conector.x}
                y2={conector.y}
                stroke={color}
                strokeWidth={0.8}
                strokeOpacity={0.6}
              />
              <text
                x={glifo.x}
                y={glifo.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={27}
                fill={color}
              >
                {/*
                  Una sola cadena, no varios nodos. Un `<title>` solo puede
                  contener texto, y React avisa —una vez por planeta— si recibe
                  un array. El navegador se quedaría con el primer trozo, así
                  que el lector de pantalla oiría «Sol» en vez de «Sol en
                  Cáncer».
                */}
                <title>
                  {t(planeta.retrogrado ? 'enSignoRetrogrado' : 'enSigno', {
                    cuerpo: tCuerpos(planeta.cuerpo),
                    signo: tSignos(signoDe(planeta.longitud)),
                  })}
                </title>
                {GLIFO_CUERPO[planeta.cuerpo]}
              </text>
              {planeta.retrogrado ? (
                <text
                  x={glifo.x + 16}
                  y={glifo.y + 12}
                  textAnchor="middle"
                  fontSize={13}
                  fill={color}
                  fillOpacity={0.8}
                >
                  ℞
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>

      {parcial ? (
        <figcaption className="mt-4 rounded-2xl border border-oro-claro bg-oro-palido/60 px-4 py-3 text-sm">
          {t.rich('pieParcial', { b: (trozo) => <strong>{trozo}</strong> })}
        </figcaption>
      ) : null}
    </figure>
  )
}

/** Cúspides y números de casa, en el anillo interior. */
function Casas({
  carta,
  p,
}: {
  carta: Carta
  p: (radio: number, longitud: number) => { x: number; y: number }
}) {
  return (
    <g>
      {carta.cuspides.map((cuspide, indice) => {
        // Las cúspides 1, 4, 7 y 10 son los ejes: los dibuja `Ejes` enteros y
        // en rojo, así que aquí se saltan para no repetir el trazo.
        if (indice % 3 === 0) return null

        const desde = p(R_CASAS_INT, cuspide)
        const hasta = p(R_SIGNOS_INT, cuspide)

        return (
          <line
            key={`cuspide-${indice}`}
            x1={desde.x}
            y1={desde.y}
            x2={hasta.x}
            y2={hasta.y}
            stroke={COLOR_TRAZO_CASA}
            strokeWidth={0.9}
          />
        )
      })}

      {carta.cuspides.map((cuspide, indice) => {
        const siguiente = carta.cuspides[(indice + 1) % 12]!
        const medio = normalizar(cuspide + normalizar(siguiente - cuspide) / 2)
        const numero = p(R_NUMERO_CASA, medio)

        return (
          <text
            key={`numero-casa-${indice}`}
            x={numero.x}
            y={numero.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={14}
            fill="var(--color-tinta-tenue)"
          >
            {indice + 1}
          </text>
        )
      })}
    </g>
  )
}

/**
 * Ascendente–Descendente y Medio Cielo–Fondo del Cielo.
 *
 * Diámetros completos con punta de flecha en el Ascendente y en el Medio
 * Cielo, que es la convención de la carta impresa: sin texto, la flecha basta
 * para saber por dónde entra la carta. El nombre va en un `<title>`, para el
 * lector de pantalla y para quien pase el ratón por encima.
 */
function Ejes({
  carta,
  p,
  anguloDe,
  t,
}: {
  carta: Carta
  p: (radio: number, longitud: number) => { x: number; y: number }
  anguloDe: (longitud: number) => number
  t: (clave: string) => string
}) {
  const ejes = [
    { longitud: carta.ascendente, nombre: t('ascendente') },
    { longitud: carta.medioCielo, nombre: t('medioCielo') },
  ].filter((eje): eje is { longitud: number; nombre: string } => eje.longitud !== null)

  return (
    <g>
      {ejes.map(({ longitud, nombre }) => {
        const punta = p(R_SIGNOS_INT, longitud)
        const opuesto = p(R_SIGNOS_INT, longitud + 180)

        return (
          <g key={nombre}>
            <title>{nombre}</title>
            <line
              x1={opuesto.x}
              y1={opuesto.y}
              x2={punta.x}
              y2={punta.y}
              stroke={COLOR_EJE}
              strokeWidth={1.4}
            />
            <path d={flecha(R_SIGNOS_INT, anguloDe(longitud))} fill={COLOR_EJE} />
          </g>
        )
      })}
    </g>
  )
}

/** Punta de flecha apoyada en un radio, apuntando hacia fuera. */
function flecha(radio: number, anguloGrados: number, largo = 17, ancho = 6): string {
  const rad = (anguloGrados * Math.PI) / 180

  const punta = punto(C, C, radio, anguloGrados)
  const base = punto(C, C, radio - largo, anguloGrados)

  // Perpendicular a la dirección del eje, para abrir la base del triángulo.
  const px = -Math.sin(rad) * ancho
  const py = Math.cos(rad) * ancho

  return [
    `M ${r1(punta.x)} ${r1(punta.y)}`,
    `L ${r1(base.x + px)} ${r1(base.y + py)}`,
    `L ${r1(base.x - px)} ${r1(base.y - py)}`,
    'Z',
  ].join(' ')
}

/** Un decimal basta a este tamaño y deja el trazado mucho más corto. */
function r1(n: number): number {
  return Math.round(n * 10) / 10
}
