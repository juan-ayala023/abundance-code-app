/**
 * Estado del formulario de onboarding.
 *
 * Vive fuera de `actions.ts` porque ese módulo lleva `'use server'`, y un
 * módulo de acciones de servidor SOLO puede exportar funciones asíncronas.
 * Exportar de ahí una constante no da error de compilación: llega al cliente
 * como `undefined` y revienta en el primer render.
 */
export type EstadoFormulario = {
  error: string | null
  /** Errores por campo, para pintarlos junto a su input. */
  campos: Record<string, string>
}

export const ESTADO_INICIAL: EstadoFormulario = { error: null, campos: {} }
