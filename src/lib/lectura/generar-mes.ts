import 'server-only'

import { generateObject } from 'ai'
import type { z } from 'zod'

import { MODELO_LECTURA, modelo, opcionesRazonamiento } from '@/lib/ai/modelo'
import { describirCarta } from '@/lib/astrology/describir'
import { describirDiasSenalados, describirPronostico } from '@/lib/astrology/describir-pronostico'
import type { DiasSenalados } from '@/lib/astrology/dias-senalados'
import type { Pronostico } from '@/lib/astrology/pronostico'
import type { Carta } from '@/lib/astrology/types'
import type { Idioma } from '@/i18n/idioma'

import { completarSecciones } from './completar'
import { instruccionDeIdioma } from './idioma-prompt'
import { esquemaDeTexto, mesGeneradoSchema, type MesTexto } from './schemas'
import { CONTROL_CALIDAD, LEXICO_MARCA, LIMITES_PRONOSTICO, nombreDePila, vozComun } from './voz'

/**
 * La lectura del mes: qué se mueve, cuándo y en qué área de su vida.
 *
 * Es la pieza central de la Prioridad 4 del documento del 23 de septiembre de
 * 2026, que la definió apartado por apartado: dieciséis, del tema del mes a
 * las tres acciones concretas, pasando por los tercios del periodo, las cuatro
 * áreas y las tres listas de fechas.
 *
 * Dos cosas la sostienen, y son las mismas que sostenían el pronóstico:
 *
 *   1. **Las fechas no las pone el modelo.** Llegan calculadas —días de
 *      exacto, estaciones, lunaciones— y el modelo escribe sobre
 *      identificadores (`v1`, `f2`, `c1`). Las fechas se pegan después, desde
 *      el cálculo. Si se le dejara escribirlas, las inventaría.
 *   2. **Probabilidad, no certeza.** Dice qué se activa y qué formas plausibles
 *      tiene, no qué va a ocurrir. Es lo que separa esto de la adivinación y lo
 *      que permite sostenerlo por escrito en los términos de la web.
 *
 * Lo que cambia respecto de lo anterior es la **voz**: el documento pidió
 * acercarla a la del TikTok de la marca —intriga emocional, contrastes, cierre
 * en claridad— y esa parte vive en `LEXICO_MARCA`.
 */

export class MesError extends Error {}

/** Lo que devuelve el modelo: todo el texto, sin una sola fecha. */
type MesEscrito = z.infer<typeof mesGeneradoSchema>

const sistema = (idioma: Idioma, nombre: string | null) => `Eres el intérprete de Abundance Code. Escribes la Lectura del Mes: qué se mueve en la vida de esta persona durante el periodo, cuándo y en qué área.

CÓMO ESCRIBES
${vozComun(idioma, nombre)}

${LEXICO_MARCA}

QUÉ HACE DISTINTO A ESTE TEXTO
- **Es una historia, no una lista de consejos.** Tiene principio, tensión y desarrollo: el mes empieza de una manera, algo se mueve a mitad y se define al final. Los apartados son las partes de esa historia, no ocho avisos sueltos.
- **Es predictivo y temporal.** No basta con «es un periodo de transformación» o «pueden surgir cambios»: eso no dice nada. Explica QUÉ TIPO DE SITUACIÓN podría materializar esa configuración en la vida cotidiana —una conversación, una propuesta, un silencio, una decisión, un límite, un gasto, un reencuentro— y en qué área se sentiría.
- **Trabajas sobre las fechas que te doy, con SUS días.** No inventes ninguna, no las muevas, no añadas. Cita cada una por su identificador en el campo "id".
- **Los identificadores (v1, f2, c1) son internos y NUNCA aparecen en el texto.** Solo en el campo "id". Dentro de una frase, una fecha se nombra por sus días, nunca por el código: quien lee no sabe qué es «v3».
- **El peso lo marcan los factores que coinciden.** Una ventana con cuatro factores pesa mucho más que una con un aspecto suelto. Respeta la intensidad indicada: no conviertas una ventana «para observar» en un acontecimiento mayor.
- **El trasfondo no tiene fecha.** Los tránsitos largos describen la etapa del mes y ahí es donde se nota; no les pongas día.
- **En relaciones puedes predecir que una dinámica se activa** —un contacto, una conversación, un distanciamiento, una definición— pero nunca afirmar qué piensa o siente otra persona, ni garantizar que alguien concreto vuelva.

QUÉ VA EN CADA APARTADO
- titular: una sola frase que abre el mes y se dirige a la persona. Es lo primero que se lee y lo que decide si sigue leyendo.
- temaPrincipal: la apertura, entre 100 y 150 palabras. Qué empieza a cambiar, qué emoción podría provocar, dónde puede manifestarse y qué pregunta deja abierta.
- queEmpiezaAMoverse: lo que se pone en marcha y todavía no tiene forma.
- primeraParte / mitadDelMes / finalDelMes: los tres tercios del periodo, cada uno con su tono. Tienen que distinguirse entre sí; si los tres dicen lo mismo, el mes no es una historia.
- abundancia, amor, trabajo, mundoEmocional: cada área con una situación posible, la emoción o el patrón que puede activar, una señal observable y una recomendación.
- diasImportantes: una entrada por cada ventana de la lista. El titular crea anticipación sin afirmar un hecho («Una decisión pide límites más claros»); el texto dice en dos o tres frases qué podría pasar y dónde se sentiría; después, la señal, qué favorece y con qué hay que tener cuidado.
- diasFavorables: uno por cada día que abre. Nada de «buen día para…»: di qué se facilita y cómo va a reconocerlo cuando pase.
- diasCuidado: uno por cada día que pide atención. No anuncies peligro: explica el riesgo emocional —reaccionar de más, cerrar una puerta antes de tiempo, confundir una duda con una conclusión—.
- patronKarmico: qué ciclo se está mostrando o corrigiendo este mes. Simbólico, como cierre de ciclo, nunca como castigo ni deuda.
- oportunidad: la puerta principal del mes, en concreto.
- advertencia: lo que más fácilmente podría costarle, dicho sin miedo.
- tresAcciones: tres, concretas y pequeñas, que salgan de todo lo anterior. Cosas que se hacen en un rato, no propósitos de vida.

${CONTROL_CALIDAD}

QUÉ NO HACES
${LIMITES_PRONOSTICO}`

export async function generarMes(entrada: {
  nombre: string | null
  carta: Carta
  pronostico: Pronostico
  dias: DiasSenalados
  idioma: Idioma
}): Promise<MesTexto> {
  const nombre = nombreDePila(entrada.nombre)
  const { ventanas } = entrada.pronostico

  const prompt = [
    'CARTA NATAL YA CALCULADA:',
    describirCarta(entrada.carta),
    '',
    describirPronostico(entrada.pronostico),
    '',
    describirDiasSenalados(entrada.dias),
    '',
    `Escribe la lectura del mes completa. En "diasImportantes", una entrada por cada ventana (${
      ventanas.map((v) => v.id).join(', ') || 'ninguna'
    }), en el mismo orden y con su identificador exacto. En "diasFavorables" y "diasCuidado", una entrada por cada día de esas listas (${
      [...entrada.dias.favorables, ...entrada.dias.cuidado].map((d) => d.id).join(', ') || 'ninguno'
    }). Si una lista está vacía, devuélvela vacía: no inventes fechas.`,
  ].join('\n')

  try {
    const { object, usage } = await generateObject({
      model: modelo(MODELO_LECTURA),
      schema: mesGeneradoSchema,
      system: sistema(entrada.idioma, nombre),
      prompt,
      // Es el texto más largo y con más partes móviles del producto.
      providerOptions: opcionesRazonamiento('medium'),
      maxOutputTokens: 8000,
    })

    console.info('[mes] generado', {
      ventanas: ventanas.length,
      entrada: usage.inputTokens,
      salida: usage.outputTokens,
      razonamiento: usage.outputTokenDetails?.reasoningTokens,
    })

    /* Ningún apartado se publica cortado. Las listas se revisan aparte. */
    const completo = await completarSecciones<MesEscrito>(
      object,
      async (claves) => {
        const { object: rehechas } = await generateObject({
          model: modelo(MODELO_LECTURA),
          // Solo apartados de texto: `completarSecciones` no mira las listas.
          schema: esquemaDeTexto(claves),
          system: sistema(entrada.idioma, nombre),
          prompt: `${prompt}\n\nVuelve a escribir SOLO estos apartados, completos y terminados en punto: ${claves.join(
            ', ',
          )}. La versión anterior quedó cortada.`,
          providerOptions: opcionesRazonamiento('low'),
        })
        return rehechas as Partial<MesEscrito>
      },
      'mes',
    )

    return conFechas(completo, entrada, entrada.idioma)
  } catch (error) {
    console.error('[mes] falló la generación', error)
    throw new MesError('No pudimos preparar tu lectura del mes ahora mismo.')
  }
}

/** Traduce una lectura del mes ya escrita, conservando todas las fechas. */
export async function traducirMes(texto: MesTexto, idioma: Idioma): Promise<MesTexto> {
  try {
    const { object } = await generateObject({
      model: modelo(MODELO_LECTURA),
      schema: mesGeneradoSchema,
      system: `Traduces al ${
        idioma === 'en' ? 'inglés' : 'español'
      } una lectura astrológica mensual, campo por campo, sin resumir ni añadir nada. Mantienes el tono, la intensidad y la longitud. No traduzcas los identificadores ni cambies ninguna fecha. ${instruccionDeIdioma(idioma)}`,
      prompt: JSON.stringify(texto),
      maxOutputTokens: 8000,
    })

    /* Las fechas vuelven del original, no de la traducción. */
    return {
      ...object,
      idioma,
      diasImportantes: emparejar(object.diasImportantes, texto.diasImportantes),
      diasFavorables: emparejar(object.diasFavorables, texto.diasFavorables),
      diasCuidado: emparejar(object.diasCuidado, texto.diasCuidado),
    }
  } catch (error) {
    console.error('[mes] falló la traducción', error)
    throw new MesError('No pudimos traducir tu lectura del mes ahora mismo.')
  }
}

/**
 * Pega a cada apartado escrito las fechas que puso el cálculo.
 *
 * Aunque el modelo escriba una fecha equivocada dentro de una frase, la que se
 * enseña arriba —la que la persona apunta en su calendario— es la calculada.
 * Lo que no case con ningún identificador se descarta: es una fecha inventada.
 */
function conFechas(
  escrito: MesEscrito,
  entrada: { pronostico: Pronostico; dias: DiasSenalados },
  idioma: Idioma,
): MesTexto {
  const ventanas = new Map(entrada.pronostico.ventanas.map((v) => [v.id, v]))
  const favorables = new Map(entrada.dias.favorables.map((d) => [d.id, d]))
  const cuidado = new Map(entrada.dias.cuidado.map((d) => [d.id, d]))

  return {
    ...escrito,
    idioma,
    diasImportantes: escrito.diasImportantes
      .filter((dia) => ventanas.has(dia.id))
      .map((dia) => {
        const calculada = ventanas.get(dia.id)!
        return {
          ...dia,
          desde: calculada.desde,
          hasta: calculada.hasta,
          fecha: calculada.fecha,
          nivel: calculada.nivel,
        }
      }),
    diasFavorables: escrito.diasFavorables
      .filter((dia) => favorables.has(dia.id))
      .map((dia) => ({ ...dia, fecha: favorables.get(dia.id)!.fecha })),
    diasCuidado: escrito.diasCuidado
      .filter((dia) => cuidado.has(dia.id))
      .map((dia) => ({ ...dia, fecha: cuidado.get(dia.id)!.fecha })),
  }
}

/** Empareja por id la versión traducida con la original, para heredar fechas. */
function emparejar<T extends { id: string }, O extends { id: string }>(
  traducidos: T[],
  originales: O[],
): (T & Omit<O, keyof T>)[] {
  const porId = new Map(originales.map((original) => [original.id, original]))
  return traducidos
    .filter((traducido) => porId.has(traducido.id))
    .map((traducido) => ({ ...porId.get(traducido.id)!, ...traducido }) as T & Omit<O, keyof T>)
}
