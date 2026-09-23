import { NOMBRE_ASPECTO, NOMBRE_CUERPO } from '@/components/chart/glifos'

import type { EventoPronostico, Pronostico, PuntoNatal } from './pronostico'

/**
 * El calendario calculado, en palabras, para el prompt.
 *
 * Misma frontera que `describirCarta()` y `describirTransitos()`: la IA no
 * calcula astronomía. Aquí se le entrega lo que ya está calculado —qué toca
 * qué, en qué casa, qué día y con cuánto peso— y su trabajo es decir qué
 * puede significar eso en la vida de alguien.
 */

const NOMBRE_NATAL: Record<PuntoNatal, string> = {
  sol: 'Sol',
  luna: 'Luna',
  mercurio: 'Mercurio',
  venus: 'Venus',
  marte: 'Marte',
  jupiter: 'Júpiter',
  saturno: 'Saturno',
  urano: 'Urano',
  neptuno: 'Neptuno',
  pluton: 'Plutón',
  ascendente: 'Ascendente',
  medioCielo: 'Medio Cielo',
}

/**
 * De qué habla cada casa.
 *
 * Va aquí y no en el prompt para que el modelo no tenga que acordarse de la
 * astrología tradicional —que es donde más se inventa— y para que dos
 * pronósticos del mismo mes hablen del mismo asunto cuando toque la misma casa.
 */
const ASUNTO_CASA: Record<number, string> = {
  1: 'cómo se presenta y se muestra, el cuerpo, los comienzos personales',
  2: 'el dinero propio, los recursos, lo que se gana y lo que se valora',
  3: 'conversaciones, gestiones, desplazamientos cortos, hermanos y entorno cercano',
  4: 'la casa, la familia, las raíces, lo privado',
  5: 'lo creativo, el disfrute, los hijos, los romances, lo que se arriesga',
  6: 'el trabajo del día a día, la salud, las rutinas, los servicios',
  7: 'la pareja, los socios, los acuerdos, los vínculos uno a uno',
  8: 'lo compartido: dinero de otros, deudas, herencias, intimidad, procesos de cierre',
  9: 'viajes largos, estudios, extranjero, creencias, asuntos legales',
  10: 'la profesión, la reputación, lo público, la dirección de la carrera',
  11: 'amistades, redes, grupos, proyectos colectivos, lo que se aspira',
  12: 'lo que ocurre en privado, el retiro, lo que se cierra, lo que aún no se ve',
}

function casaTexto(casa: number | null): string {
  if (casa === null) return ''
  return ` — casa ${casa} (${ASUNTO_CASA[casa] ?? 'área sin describir'})`
}

function lineaEvento(evento: EventoPronostico): string {
  switch (evento.clase) {
    case 'aspecto':
      return `${NOMBRE_CUERPO[evento.transitante]} en tránsito hace ${NOMBRE_ASPECTO[
        evento.tipo
      ].toLowerCase()} a su ${NOMBRE_NATAL[evento.natal]} natal (exacto el ${evento.fecha}, orbe ${evento.orbe}°)${casaTexto(evento.casa)}`
    case 'estacion':
      return `${NOMBRE_CUERPO[evento.cuerpo]} se queda ${
        evento.sentido === 'retrogrado' ? 'retrógrado' : 'directo'
      } en ${evento.signo} el ${evento.fecha}${casaTexto(evento.casa)}`
    case 'lunacion':
      return `Luna ${evento.tipo === 'nueva' ? 'nueva' : 'llena'} en ${evento.signo} el ${evento.fecha}${casaTexto(
        evento.casa,
      )}${evento.sobre ? `, cayendo sobre su ${NOMBRE_NATAL[evento.sobre]} natal` : ''}`
    case 'ingreso':
      return `${NOMBRE_CUERPO[evento.cuerpo]} entra en ${evento.signo} el ${evento.fecha}${casaTexto(evento.casa)}`
  }
}

const NIVEL_TEXTO = {
  alta: 'intensidad alta (varios factores coinciden)',
  media: 'intensidad media',
  observar: 'intensidad baja: para observar, no para anunciar',
} as const

export function describirPronostico(pronostico: Pronostico): string {
  const partes: string[] = [
    `PERIODO ANALIZADO: del ${pronostico.desde} al ${pronostico.hasta}.`,
    '',
  ]

  if (pronostico.trasfondo.length > 0) {
    partes.push(
      'TRASFONDO DEL PERIODO (tránsitos largos, activos durante semanas o meses; NO les pongas una fecha concreta, describen la etapa):',
      ...pronostico.trasfondo.map((evento) => `- ${lineaEvento(evento)}`),
      '',
    )
  }

  if (pronostico.ventanas.length === 0) {
    partes.push(
      'VENTANAS: ninguna concentración destacable en este periodo. Dilo con naturalidad: es un mes de fondo tranquilo, sin picos. No inventes ninguno.',
    )
    return partes.join('\n')
  }

  partes.push('VENTANAS TEMPORALES (cada una con su identificador; usa EXACTAMENTE estas fechas):')

  for (const ventana of pronostico.ventanas) {
    partes.push(
      '',
      `[${ventana.id}] del ${ventana.desde} al ${ventana.hasta}, con el punto más fuerte el ${ventana.fecha}. ${
        NIVEL_TEXTO[ventana.nivel]
      }. Factores que coinciden: ${ventana.eventos.length}.`,
      ...ventana.eventos.slice(0, 5).map((evento) => `  · ${lineaEvento(evento)}`),
    )
  }

  return partes.join('\n')
}
