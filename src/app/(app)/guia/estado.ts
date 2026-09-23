/**
 * Estado del formulario de consulta.
 *
 * Vive fuera de `actions.ts` porque ese módulo lleva `'use server'`, y un
 * módulo de acciones de servidor SOLO puede exportar funciones asíncronas.
 * Exportar de ahí una constante compila, pasa el build y llega al cliente
 * como `undefined`.
 */

/** Un turno de la conversación: lo que se preguntó y lo que se contestó. */
export type MensajeConsulta = {
  pregunta: string
  respuesta: string
  /**
   * `aclaracion` es la guía pidiendo un dato antes de responder. No gasta
   * consulta ni cuenta como seguimiento: ver la migración de los hilos.
   */
  tipo: 'consulta' | 'seguimiento' | 'aclaracion'
}

export type EstadoConsulta = {
  error: string | null
  /** El hilo abierto, con todo lo hablado. Vacío mientras no se pregunte. */
  mensajes: MensajeConsulta[]
  /** El identificador del hilo, que viaja al servidor en cada seguimiento. */
  hilo: string | null
  /** Cuántas preguntas más admite este tema. */
  seguimientosRestantes: number
  /** Consultas que le quedan del mes, ya descontada la de este envío. */
  restantesDelMes: number | null
}

export const ESTADO_INICIAL: EstadoConsulta = {
  error: null,
  mensajes: [],
  hilo: null,
  seguimientosRestantes: 0,
  restantesDelMes: null,
}
