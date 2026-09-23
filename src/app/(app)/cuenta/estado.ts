/**
 * Estado del cambio de nombre.
 *
 * Vive fuera de `actions.ts` porque ese módulo lleva `'use server'`, y uno de
 * acciones de servidor SOLO puede exportar funciones asíncronas.
 */
export type EstadoNombre = {
  /** El nombre ya guardado. `null` mientras no se haya cambiado nada. */
  nombre: string | null
  error: string | null
}

export const ESTADO_INICIAL: EstadoNombre = { nombre: null, error: null }
