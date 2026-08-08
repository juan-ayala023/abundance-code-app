/**
 * Rutas del grupo (app): requieren sesión y entitlement activo.
 *
 * Los grupos de rutas de Next no aparecen en la URL, así que el middleware no
 * puede deducir "esto es (app)" del pathname. Esta lista es esa correspondencia,
 * y vive aquí para que middleware y tests usen exactamente la misma.
 *
 * Al añadir una página bajo src/app/(app)/, añádela también aquí.
 */
export const RUTAS_PROTEGIDAS = [
  '/onboarding',
  '/generando',
  '/carta',
  '/portal',
  '/lectura-base',
  '/activacion',
  '/guia',
  '/cuenta',
] as const

export function esRutaProtegida(pathname: string): boolean {
  return RUTAS_PROTEGIDAS.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`),
  )
}
