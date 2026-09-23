import type { EventoPronostico, Pronostico } from './pronostico'

/**
 * Los días favorables y los días de cuidado del periodo.
 *
 * El documento del 23 de septiembre pide las dos listas dentro de la lectura
 * del mes, y pide además que no sean «buen día para…»: hay que decir qué se
 * facilita y cómo reconocerlo. Eso lo escribe el modelo. Lo que se decide aquí
 * es **qué días son**, que es lo que no puede inventarse.
 *
 * El criterio es el clásico y no tiene más misterio: un tránsito armónico
 * —trígono o sextil— o una conjunción de Venus o Júpiter abre; una cuadratura,
 * una oposición o una conjunción de Saturno, Marte o Plutón aprieta. No se
 * traduce como «bueno» y «malo»: un día de cuidado es un día que pide
 * atención, y así se escribe.
 *
 * Los días que ya están dentro de una ventana importante se descartan: esos
 * tienen su propio apartado, y repetirlos aquí haría que el mes pareciera
 * tener el doble de fechas señaladas de las que tiene.
 */

/** Un día suelto del periodo, con lo que lo señala. */
export type DiaSenalado = {
  /** `f1`, `f2`… o `c1`, `c2`… El modelo escribe sobre este identificador. */
  id: string
  fecha: string
  /** Lo que ocurre ese día. Nunca vacío. */
  eventos: EventoPronostico[]
  peso: number
}

export type DiasSenalados = {
  favorables: DiaSenalado[]
  cuidado: DiaSenalado[]
}

/** Cuántos de cada clase se le ofrecen al modelo. */
const MAXIMO = 3

/** Días mínimos entre dos fechas de la misma lista, para que no se amontonen. */
const SEPARACION = 3

export function diasSenalados(pronostico: Pronostico): DiasSenalados {
  const ocupados = new Set<string>()
  for (const ventana of pronostico.ventanas) {
    for (const dia of diasEntre(ventana.desde, ventana.hasta)) ocupados.add(dia)
  }

  const porFecha = new Map<string, EventoPronostico[]>()
  for (const evento of pronostico.eventos) {
    if (ocupados.has(evento.fecha)) continue
    if (tono(evento) === null) continue
    porFecha.set(evento.fecha, [...(porFecha.get(evento.fecha) ?? []), evento])
  }

  const candidatos: (DiaSenalado & { tono: 'favorable' | 'cuidado' })[] = []

  for (const [fecha, eventos] of porFecha) {
    /*
     * Un día con un trígono y una cuadratura no es ninguna de las dos cosas.
     * Se queda fuera: mandar a alguien a «aprovechar» un día que también
     * aprieta es peor que no señalarlo.
     */
    const abren = eventos.filter((evento) => tono(evento) === 'favorable')
    const aprietan = eventos.filter((evento) => tono(evento) === 'cuidado')
    if (abren.length > 0 && aprietan.length > 0) continue

    const elegidos = abren.length > 0 ? abren : aprietan
    candidatos.push({
      id: '',
      fecha,
      eventos: elegidos,
      peso: elegidos.reduce((suma, evento) => suma + evento.peso, 0),
      tono: abren.length > 0 ? 'favorable' : 'cuidado',
    })
  }

  return {
    favorables: elegir(candidatos.filter((c) => c.tono === 'favorable'), 'f'),
    cuidado: elegir(candidatos.filter((c) => c.tono === 'cuidado'), 'c'),
  }
}

/**
 * Los más fuertes, repartidos por el mes.
 *
 * Ordenar por peso y cortar daría tres días seguidos de la misma semana: los
 * tránsitos llegan a exacto en racimos. Se exige separación entre uno y otro
 * para que las fechas señalen momentos distintos del periodo.
 */
function elegir(candidatos: DiaSenalado[], prefijo: string): DiaSenalado[] {
  const elegidos: DiaSenalado[] = []

  for (const candidato of [...candidatos].sort((a, b) => b.peso - a.peso)) {
    if (elegidos.length >= MAXIMO) break
    const pegado = elegidos.some(
      (elegido) => Math.abs(diasDeDiferencia(elegido.fecha, candidato.fecha)) < SEPARACION,
    )
    if (pegado) continue
    elegidos.push(candidato)
  }

  return elegidos
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((dia, indice) => ({ ...dia, id: `${prefijo}${indice + 1}` }))
}

/**
 * Si un evento abre o aprieta. `null` si no dice ni una cosa ni la otra.
 *
 * Las lunaciones, los ingresos y las estaciones no se clasifican: una luna
 * nueva no es buena ni mala por sí misma —depende de dónde caiga—, y
 * etiquetarla sería inventar. Esas fechas ya viajan en las ventanas
 * importantes y en el trasfondo.
 */
function tono(evento: EventoPronostico): 'favorable' | 'cuidado' | null {
  if (evento.clase !== 'aspecto') return null

  if (evento.tipo === 'trigono' || evento.tipo === 'sextil') return 'favorable'
  if (evento.tipo === 'cuadratura' || evento.tipo === 'oposicion') return 'cuidado'

  // Conjunción: la marca el planeta que transita.
  if (evento.transitante === 'venus' || evento.transitante === 'jupiter') return 'favorable'
  if (evento.transitante === 'saturno' || evento.transitante === 'marte' || evento.transitante === 'pluton') {
    return 'cuidado'
  }

  return null
}

function diasEntre(desde: string, hasta: string): string[] {
  const dias: string[] = []
  const fin = Date.parse(`${hasta}T00:00:00Z`)
  for (let t = Date.parse(`${desde}T00:00:00Z`); t <= fin; t += 86_400_000) {
    dias.push(new Date(t).toISOString().slice(0, 10))
  }
  return dias
}

function diasDeDiferencia(a: string, b: string): number {
  return (Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000
}
