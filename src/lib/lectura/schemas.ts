import { z } from 'zod'

import type { Cuerpo } from '@/lib/astrology/types'

/**
 * Estructura de la lectura base y de las activaciones diarias.
 *
 * Las secciones salen del producto anterior, no de una invención: son las que
 * el usuario ya conoce. Este esquema hace doble función — valida lo que se
 * guarda en `portals.base_reading` y será el esquema que reciba `generateObject`
 * cuando se conecte la IA (CLAUDE.md §8), de modo que el modelo no pueda
 * devolver una lectura a la que le falte una sección.
 */

const parrafo = z.string().trim().min(1)

/**
 * Idioma en que se escribió un contenido, y sus traducciones guardadas.
 *
 * Lo que se genera se guarda una vez y no se reescribe. Pero la interfaz es
 * bilingüe, y quien cambia a inglés veía los títulos en inglés y los párrafos
 * en español (Andrea, 17 sept 2026). Ahora cada contenido recuerda en qué
 * idioma nació (`idioma`; si falta, es anterior a este cambio: español) y
 * puede llevar versiones traducidas (`traducciones`), que se piden desde la
 * pantalla y se guardan al lado del original.
 */
const idiomaContenido = z.enum(['es', 'en'])
const conIdioma = {
  idioma: idiomaContenido.optional(),
  traducciones: z.record(z.string(), z.record(z.string(), z.string())).optional(),
}

/**
 * Las secciones de la lectura, en el orden en que se leen.
 *
 * El orden es el del documento del 23 de septiembre de 2026, que lo pidió
 * explícitamente: del retrato general a lo concreto —dinero, vínculos, patrones—
 * y termina en un paso que se pueda dar esta semana.
 *
 * Dos secciones de ese documento no existían y se añadieron: `mundoEmocional` y
 * `amorVinculos`, más `aprendizajeKarmico`. Y dos que sí existen no estaban en
 * su lista —`energiaPrincipal` y `senalesPersonales`—: se conservan, porque son
 * contenido que la gente ya tiene comprado, colocadas junto a lo que más se les
 * parece.
 */
export const SECCIONES_LECTURA = [
  { clave: 'energiaPrincipal', titulo: 'Tu energía principal' },
  { clave: 'mundoEmocional', titulo: 'Tu mundo emocional' },
  { clave: 'patronesAbundancia', titulo: 'Abundancia y dinero' },
  { clave: 'amorVinculos', titulo: 'Amor y vínculos' },
  { clave: 'bloqueosInternos', titulo: 'Patrones repetidos' },
  { clave: 'senalesPersonales', titulo: 'Tus señales personales' },
  { clave: 'aprendizajeKarmico', titulo: 'Aprendizaje kármico' },
  { clave: 'formaDecidir', titulo: 'Tu forma de decidir' },
  { clave: 'fortalezas', titulo: 'Tus fortalezas' },
  { clave: 'recomendacionInicial', titulo: 'Tu siguiente paso' },
] as const

export type ClaveSeccion = (typeof SECCIONES_LECTURA)[number]['clave']

const camposLectura = {
  /** Párrafo de apertura: «Resumen de tu Código Personal». */
  resumen: parrafo,
  energiaPrincipal: parrafo,
  patronesAbundancia: parrafo,
  bloqueosInternos: parrafo,
  formaDecidir: parrafo,
  senalesPersonales: parrafo,
  fortalezas: parrafo,
  recomendacionInicial: parrafo,
}

/**
 * Las secciones añadidas el 23 de septiembre de 2026.
 *
 * Van aparte porque **al leer son opcionales y al generar no**. Las lecturas
 * escritas antes de esa fecha no las tienen, y una lectura sin ellas es
 * completa para quien la compró: exigirlas al validar dejaría esas lecturas sin
 * poder abrirse. Toda lectura nueva sí las trae.
 */
const camposNuevos = {
  mundoEmocional: parrafo,
  amorVinculos: parrafo,
  aprendizajeKarmico: parrafo,
}

/** Solo el texto de una lectura: lo que se traduce y lo que se muestra. */
export const lecturaTextoSchema = z.object({
  ...camposLectura,
  mundoEmocional: parrafo.optional(),
  amorVinculos: parrafo.optional(),
  aprendizajeKarmico: parrafo.optional(),
  /** Desarrollo largo, tras «Leer análisis completo». Opcional. */
  analisisCompleto: parrafo.optional(),
})
export type LecturaTexto = z.infer<typeof lecturaTextoSchema>

export const lecturaBaseSchema = lecturaTextoSchema.extend(conIdioma)

export type LecturaBase = z.infer<typeof lecturaBaseSchema>

/**
 * Lo que se le exige al modelo al generar.
 *
 * Se separa del anterior por una restricción del proveedor: el modo estricto de
 * OpenAI obliga a que **todas** las propiedades sean obligatorias, y rechaza el
 * esquema entero si una es opcional. Así que al generar se piden las nueve.
 *
 * El de arriba sigue admitiendo lecturas sin `analisisCompleto`, porque valida
 * lo que ya está guardado y no todo tiene por qué haberse generado igual.
 */
export const lecturaGeneradaSchema = z.object({
  ...camposLectura,
  ...camposNuevos,
  analisisCompleto: parrafo,
})

/** Solo las secciones nuevas: para completar una lectura anterior a ellas. */
export const seccionesNuevasSchema = z.object(camposNuevos)

/** Las claves de las secciones que se añadieron después. */
export const CLAVES_NUEVAS = Object.keys(camposNuevos) as (keyof typeof camposNuevos)[]

/** Las de `CLAVES_NUEVAS` que una lectura guardada todavía no tiene. */
export function clavesQueFaltan(lectura: Record<string, unknown>): string[] {
  return CLAVES_NUEVAS.filter((clave) => {
    const valor = lectura[clave]
    return typeof valor !== 'string' || valor.trim().length === 0
  })
}

/**
 * Un esquema estricto con exactamente estas claves de texto.
 *
 * Para traducir hace falta pedir al modelo **las secciones que esa lectura
 * tiene**, ni una más: con un esquema fijo, una lectura anterior a las
 * secciones nuevas obligaba al modelo a escribirlas, y lo que devolvía no era
 * una traducción sino texto inventado sobre una carta que no había visto.
 */
export function esquemaDeTexto(claves: string[]) {
  return z.object(Object.fromEntries(claves.map((clave) => [clave, parrafo])))
}

/**
 * La activación de hoy, con la estructura del 23 de septiembre de 2026.
 *
 * Antes eran cinco bloques de 150 a 220 palabras —mensaje, observar, evitar,
 * activar y una pregunta— y el documento la quiere más corta y más directa:
 * un titular que enganche, qué podría pasar, la señal, qué evitar y qué
 * activar, entre 80 y 140 palabras en total.
 *
 * Las activaciones escritas con la forma anterior no validan contra esto, y es
 * lo correcto: son de un día concreto, ya pasado. `asegurarActivacion()` las
 * reescribe si alguien vuelve a abrir ese día.
 */
export const activacionDiariaSchema = z.object({
  /** Frase de intriga. Es lo primero que se lee. */
  titular: parrafo,
  /** Qué podría pasar hoy y en qué área. Dos o tres frases. */
  situacion: parrafo,
  /** Qué conviene observar: una frase, un gesto, una repetición. */
  senal: parrafo,
  evita: parrafo,
  activa: parrafo,
  /** En qué idioma se escribió. Si falta, español (anterior al cambio). */
  idioma: idiomaContenido.optional(),
})

export type ActivacionDiaria = z.infer<typeof activacionDiariaSchema>

/* -------------------------------------------------------------------------
   Retrato de la carta: quién es esta persona, planeta a planeta.
   ------------------------------------------------------------------------- */

/**
 * Las secciones del retrato, en el orden en que se leen.
 *
 * El orden no es decorativo: es el que sigue cualquier lectura de carta. Sol,
 * Luna y Ascendente forman el trío que define a la persona —quién es, qué
 * necesita y cómo aparece—; después los llamados planetas personales, que
 * describen funciones concretas (pensar, querer, actuar); luego los sociales,
 * que sitúan a la persona frente al mundo. Las dos últimas no cuelgan de un
 * planeta: salen de cómo se relacionan entre sí.
 *
 * `cuerpo` es el planeta del que habla cada sección, y sirve para pintar al
 * lado su posición real —«Sol en Cáncer, 24°»— sacada de la carta y no del
 * texto. Así el título puede ser lo que el cliente pidió, «Tu forma de ser», y
 * la astrología detrás queda a la vista sin que el párrafo tenga que recitarla.
 */
export const SECCIONES_RETRATO = [
  { clave: 'sol', cuerpo: 'sol' },
  { clave: 'luna', cuerpo: 'luna' },
  /** Sale de la hora exacta: en una carta parcial no existe. Ver más abajo. */
  { clave: 'ascendente', cuerpo: null },
  { clave: 'mercurio', cuerpo: 'mercurio' },
  { clave: 'venus', cuerpo: 'venus' },
  { clave: 'marte', cuerpo: 'marte' },
  { clave: 'jupiter', cuerpo: 'jupiter' },
  { clave: 'saturno', cuerpo: 'saturno' },
  /** No cuelgan de un planeta: se derivan de los aspectos y los elementos. */
  { clave: 'habilidades', cuerpo: null },
  { clave: 'nudo', cuerpo: null },
] as const satisfies readonly { clave: string; cuerpo: Cuerpo | null }[]

export type ClaveRetrato = (typeof SECCIONES_RETRATO)[number]['clave']

const seccionesSinAscendente = {
  sol: parrafo,
  luna: parrafo,
  mercurio: parrafo,
  venus: parrafo,
  marte: parrafo,
  jupiter: parrafo,
  saturno: parrafo,
  habilidades: parrafo,
  nudo: parrafo,
}

/**
 * Lo que se valida al leer lo guardado.
 *
 * `ascendente` es opcional aquí porque **puede no existir**: depende de la hora
 * exacta de nacimiento, y sin ella la carta se calcula `partial`. Un retrato sin
 * esa sección es un retrato completo para esa persona, no uno a medias.
 */
export const retratoTextoSchema = z.object({
  apertura: parrafo,
  ...seccionesSinAscendente,
  ascendente: parrafo.optional(),
})
export type RetratoTexto = z.infer<typeof retratoTextoSchema>

export const retratoSchema = retratoTextoSchema.extend(conIdioma)

export type Retrato = z.infer<typeof retratoSchema>

/**
 * Lo que se le exige al modelo al generar, en dos formas.
 *
 * Van separados del anterior por la misma restricción del proveedor que ya
 * obligó a separar `lecturaGeneradaSchema`: el modo estricto de OpenAI exige que
 * **todas** las propiedades sean obligatorias y rechaza el esquema entero si una
 * es opcional. Así que no se puede pedir «el ascendente si lo hay» en un solo
 * esquema: hay que pedir uno u otro según la carta.
 *
 * Que el esquema no lleve el campo es además la única defensa firme contra que
 * el modelo hable del Ascendente de alguien que no dio su hora de nacimiento.
 * Pedírselo por escrito en el prompt ayuda; no dejarle sitio donde escribirlo lo
 * impide.
 */
export const retratoExactoSchema = z.object({
  apertura: parrafo,
  ascendente: parrafo,
  ...seccionesSinAscendente,
})

export const retratoParcialSchema = z.object({
  apertura: parrafo,
  ...seccionesSinAscendente,
})

/* ─────────────── La lectura del mes ───────────────
   Los dieciséis apartados que pidió el documento del 23 de septiembre de 2026.

   Ninguna fecha está en el esquema, y es a propósito: el modelo escribe sobre
   identificadores (`v1`, `f2`, `c1`) y las fechas se pegan después desde el
   cálculo, en `generar-mes.ts`. Si estuvieran aquí, las rellenaría él, y las
   rellenaría mal. */

/** Una fecha importante, escrita. Sus días los pone el cálculo. */
const diaImportanteEscritoSchema = z.object({
  /** `v1`, `v2`… el identificador de la ventana. */
  id: z.string().trim().min(1),
  /** Titular de anticipación, sin afirmar un hecho: «Una decisión pide límites más claros». */
  titular: parrafo,
  /** Dos o tres frases: qué podría pasar y en qué área. */
  texto: parrafo,
  senal: parrafo,
  favorece: parrafo,
  cuidadoCon: parrafo,
})

/** Un día favorable o de cuidado, escrito. */
const diaSueltoEscritoSchema = z.object({
  /** `f1`… o `c1`… */
  id: z.string().trim().min(1),
  texto: parrafo,
})

const camposMes = {
  /** Una frase que abre el mes y se dirige a la persona. */
  titular: parrafo,
  /** La apertura, 100–150 palabras. */
  temaPrincipal: parrafo,
  queEmpiezaAMoverse: parrafo,
  primeraParte: parrafo,
  mitadDelMes: parrafo,
  finalDelMes: parrafo,
  abundancia: parrafo,
  amor: parrafo,
  trabajo: parrafo,
  mundoEmocional: parrafo,
  patronKarmico: parrafo,
  oportunidad: parrafo,
  advertencia: parrafo,
}

/** Lo que se le pide al modelo para la lectura del mes. */
export const mesGeneradoSchema = z.object({
  ...camposMes,
  diasImportantes: z.array(diaImportanteEscritoSchema),
  diasFavorables: z.array(diaSueltoEscritoSchema),
  diasCuidado: z.array(diaSueltoEscritoSchema),
  /** Tres, ni dos ni cuatro. */
  tresAcciones: z.array(parrafo).min(3).max(3),
})

/** Lo mismo ya guardado: cada fecha con los días que puso el cálculo. */
export const mesTextoSchema = z.object({
  ...camposMes,
  diasImportantes: z.array(
    diaImportanteEscritoSchema.extend({
      desde: z.string(),
      hasta: z.string(),
      fecha: z.string(),
      nivel: z.enum(['alta', 'media', 'observar']),
    }),
  ),
  diasFavorables: z.array(diaSueltoEscritoSchema.extend({ fecha: z.string() })),
  diasCuidado: z.array(diaSueltoEscritoSchema.extend({ fecha: z.string() })),
  tresAcciones: z.array(parrafo),
  idioma: idiomaContenido.optional(),
})

export type MesTexto = z.infer<typeof mesTextoSchema>

/** Lo guardado en `forecasts.content`: el texto más sus traducciones. */
export const mesGuardadoSchema = mesTextoSchema.extend({
  traducciones: z.record(z.string(), z.unknown()).optional(),
})

export type MesGuardado = z.infer<typeof mesGuardadoSchema>

/** Duración del portal, en días. */
export const DIAS_DE_PORTAL = 30

/**
 * Consultas de guía incluidas por mes.
 *
 * Eran 3 al día. El documento del 23 de septiembre de 2026 las cambia por
 * **doce al mes, cada una con dos preguntas para profundizar**, y el cambio no
 * es solo de número: una consulta deja de ser una pregunta suelta y pasa a ser
 * una conversación sobre un tema.
 *
 * El mes es el del portal —bloques de 30 días desde que se creó—, no el del
 * calendario. Así el contador se reinicia el mismo día que el ciclo que la
 * persona ya ve en su cuenta, en vez de regalar doce consultas más el día 1 a
 * quien compró el 28.
 */
export const CONSULTAS_GUIA_POR_MES = 12

/** Preguntas para profundizar que incluye cada consulta. */
export const SEGUIMIENTOS_POR_CONSULTA = 2
