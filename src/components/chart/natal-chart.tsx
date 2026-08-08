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
  COLOR_ELEMENTO,
  ELEMENTO_SIGNO,
  GLIFO_CUERPO,
  GLIFO_SIGNO,
  NOMBRE_CUERPO,
  NOMBRE_SIGNO,
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
 */

const LADO = 800
const C = LADO / 2

const R_BORDE = 396
const R_SIGNOS_INT = 336
const R_PLANETAS = 292
const R_MARCA_PLANETA = 322
const R_CASAS_INT = 236
const R_NUMERO_CASA = 250

/** Separación mínima entre glifos de planeta, en grados. */
const SEPARACION_GLIFOS = 9

export function NatalChart({ carta, className }: { carta: Carta; className?: string }) {
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

  return (
    <figure className={className}>
      <svg
        viewBox={`0 0 ${LADO} ${LADO}`}
        className="h-auto w-full"
        role="img"
        aria-labelledby="carta-titulo carta-desc"
      >
        <title id="carta-titulo">Carta natal</title>
        <desc id="carta-desc">
          Rueda astrológica con los doce signos, {carta.planetas.length} planetas
          {parcial
            ? ' y sin casas, porque no se conoce la hora de nacimiento'
            : ', las doce casas, el Ascendente y el Medio Cielo'}
          . Debajo hay una tabla con las mismas posiciones en texto.
        </desc>

        {/* Sectores de los signos, teñidos por elemento */}
        {SIGNOS.map((signo, indice) => (
          <path
            key={`sector-${signo}`}
            d={sectorAnular(indice * 30, indice * 30 + 30, R_SIGNOS_INT, R_BORDE, anguloDe)}
            fill={COLOR_ELEMENTO[ELEMENTO_SIGNO[signo]]}
            fillOpacity={0.14}
          />
        ))}

        {/* Círculos guía */}
        {[R_BORDE, R_SIGNOS_INT, R_CASAS_INT].map((radio) => (
          <circle
            key={`circulo-${radio}`}
            cx={C}
            cy={C}
            r={radio}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.5}
            strokeWidth={1.5}
          />
        ))}

        {/* Divisiones entre signos */}
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
              stroke="currentColor"
              strokeOpacity={0.45}
              strokeWidth={1}
            />
          )
        })}

        {/* Glifos de los signos */}
        {SIGNOS.map((signo, indice) => {
          const centro = p((R_SIGNOS_INT + R_BORDE) / 2, indice * 30 + 15)
          return (
            <text
              key={`glifo-${signo}`}
              x={centro.x}
              y={centro.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={30}
              fill="currentColor"
            >
              <title>{NOMBRE_SIGNO[signo]}</title>
              {GLIFO_SIGNO[signo]}
            </text>
          )
        })}

        {/* Marcas de grado: cada 5, más largas cada 10 */}
        {Array.from({ length: 72 }, (_, i) => i * 5).map((grado) => {
          const largo = grado % 10 === 0 ? 12 : 7
          const desde = p(R_SIGNOS_INT, grado)
          const hasta = p(R_SIGNOS_INT - largo, grado)
          return (
            <line
              key={`tick-${grado}`}
              x1={desde.x}
              y1={desde.y}
              x2={hasta.x}
              y2={hasta.y}
              stroke="currentColor"
              strokeOpacity={0.35}
              strokeWidth={1}
            />
          )
        })}

        {/* Casas: solo si se conoce la hora */}
        {!parcial && carta.cuspides.length === 12 ? (
          <CasasYEjes carta={carta} anguloDe={anguloDe} p={p} />
        ) : null}

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
                strokeOpacity={0.75}
                strokeWidth={aspecto.tipo === 'conjuncion' ? 1 : 1.6}
                strokeDasharray={aspecto.tipo === 'sextil' ? '5 4' : undefined}
              />
            )
          })}
        </g>

        {/* Planetas */}
        {carta.planetas.map((planeta, indice) => {
          const longitudDibujo = longitudesDibujo[indice] ?? planeta.longitud
          const glifo = p(R_PLANETAS, longitudDibujo)

          // La marca va en la longitud REAL: el glifo puede estar desplazado
          // para que se lea, pero la posición verdadera no se falsea.
          const marcaFuera = p(R_MARCA_PLANETA, planeta.longitud)
          const marcaDentro = p(R_MARCA_PLANETA - 10, planeta.longitud)
          const conector = p(R_PLANETAS + 16, longitudDibujo)

          return (
            <g key={planeta.cuerpo}>
              <line
                x1={marcaFuera.x}
                y1={marcaFuera.y}
                x2={marcaDentro.x}
                y2={marcaDentro.y}
                stroke="currentColor"
                strokeOpacity={0.7}
                strokeWidth={1.5}
              />
              <line
                x1={marcaDentro.x}
                y1={marcaDentro.y}
                x2={conector.x}
                y2={conector.y}
                stroke="currentColor"
                strokeOpacity={0.3}
                strokeWidth={1}
              />
              <text
                x={glifo.x}
                y={glifo.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={26}
                fill="currentColor"
              >
                <title>
                  {NOMBRE_CUERPO[planeta.cuerpo]} en{' '}
                  {NOMBRE_SIGNO[signoDe(planeta.longitud)]}
                  {planeta.retrogrado ? ', retrógrado' : ''}
                </title>
                {GLIFO_CUERPO[planeta.cuerpo]}
              </text>
              {planeta.retrogrado ? (
                <text
                  x={glifo.x + 15}
                  y={glifo.y + 11}
                  textAnchor="middle"
                  fontSize={13}
                  fill="currentColor"
                  fillOpacity={0.75}
                >
                  ℞
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>

      {parcial ? (
        <figcaption className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          Esta carta se calculó sin hora de nacimiento. Las posiciones de los
          planetas son correctas, pero <strong>no incluye casas, Ascendente ni
          Medio Cielo</strong>: esos dependen de la hora exacta.
        </figcaption>
      ) : null}
    </figure>
  )
}

/** Cúspides, números de casa y los dos ejes principales. */
function CasasYEjes({
  carta,
  anguloDe,
  p,
}: {
  carta: Carta
  anguloDe: (longitud: number) => number
  p: (radio: number, longitud: number) => { x: number; y: number }
}) {
  return (
    <g>
      {carta.cuspides.map((cuspide, indice) => {
        // Las cúspides 1, 4, 7 y 10 son los ejes: se marcan más.
        const esEje = indice % 3 === 0
        const desde = p(R_CASAS_INT, cuspide)
        const hasta = p(R_SIGNOS_INT, cuspide)

        const siguiente = carta.cuspides[(indice + 1) % 12]!
        const medio = normalizar(cuspide + normalizar(siguiente - cuspide) / 2)
        const numero = p(R_NUMERO_CASA, medio)

        return (
          <g key={`casa-${indice}`}>
            <line
              x1={desde.x}
              y1={desde.y}
              x2={hasta.x}
              y2={hasta.y}
              stroke="currentColor"
              strokeOpacity={esEje ? 0.8 : 0.3}
              strokeWidth={esEje ? 2 : 1}
              strokeDasharray={esEje ? undefined : '4 4'}
            />
            <text
              x={numero.x}
              y={numero.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={14}
              fill="currentColor"
              fillOpacity={0.6}
            >
              {indice + 1}
            </text>
          </g>
        )
      })}

      {carta.ascendente !== null ? (
        <EtiquetaEje longitud={carta.ascendente} texto="AC" p={p} anguloDe={anguloDe} />
      ) : null}
      {carta.medioCielo !== null ? (
        <EtiquetaEje longitud={carta.medioCielo} texto="MC" p={p} anguloDe={anguloDe} />
      ) : null}
    </g>
  )
}

function EtiquetaEje({
  longitud,
  texto,
  p,
}: {
  longitud: number
  texto: string
  p: (radio: number, longitud: number) => { x: number; y: number }
  anguloDe: (longitud: number) => number
}) {
  const posicion = p(R_BORDE - 16, longitud)

  return (
    <text
      x={posicion.x}
      y={posicion.y}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={16}
      fontWeight={600}
      fill="currentColor"
    >
      {texto}
    </text>
  )
}

/**
 * Sector de corona circular entre dos longitudes.
 *
 * Se dibuja con dos arcos y dos radios. El indicador de barrido va a 0 porque
 * en pantalla el sentido es antihorario, al revés que las longitudes.
 */
function sectorAnular(
  desdeLongitud: number,
  hastaLongitud: number,
  radioInterior: number,
  radioExterior: number,
  anguloDe: (longitud: number) => number,
): string {
  const a1 = anguloDe(desdeLongitud)
  const a2 = anguloDe(hastaLongitud)

  const extIni = punto(C, C, radioExterior, a1)
  const extFin = punto(C, C, radioExterior, a2)
  const intFin = punto(C, C, radioInterior, a2)
  const intIni = punto(C, C, radioInterior, a1)

  return [
    `M ${extIni.x} ${extIni.y}`,
    `A ${radioExterior} ${radioExterior} 0 0 0 ${extFin.x} ${extFin.y}`,
    `L ${intFin.x} ${intFin.y}`,
    `A ${radioInterior} ${radioInterior} 0 0 1 ${intIni.x} ${intIni.y}`,
    'Z',
  ].join(' ')
}
