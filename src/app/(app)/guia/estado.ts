/**
 * Estado del formulario de consulta.
 *
 * Vive fuera de `actions.ts` porque ese módulo lleva `'use server'`, y un
 * módulo de acciones de servidor SOLO puede exportar funciones asíncronas.
 * Exportar de ahí una constante compila, pasa el build y llega al cliente
 * como `undefined`.
 */
export type EstadoConsulta = {
  error: string | null
  respuesta: string | null
  /** La pregunta que se respondió, para mostrarla junto a la respuesta. */
  pregunta: string | null
}

export const ESTADO_INICIAL: EstadoConsulta = {
  error: null,
  respuesta: null,
  pregunta: null,
}
