/**
 * Estado del formulario de corrección.
 *
 * Vive fuera de `actions.ts` porque ese módulo lleva `'use server'`, y uno de
 * acciones de servidor SOLO puede exportar funciones asíncronas.
 */
export type EstadoCorreccion = {
  enviada: boolean
  error: string | null
}

export const ESTADO_INICIAL: EstadoCorreccion = { enviada: false, error: null }
