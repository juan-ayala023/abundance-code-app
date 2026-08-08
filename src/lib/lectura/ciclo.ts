import { DIAS_DE_PORTAL } from './schemas'

/**
 * Día del ciclo de 30 en que se encuentra el portal.
 *
 * Se calcula desde la fecha de creación del portal, no desde un contador
 * guardado: un contador puede desincronizarse, una fecha no. El día 1 es el
 * de la creación, y se satura en 30 en vez de seguir subiendo.
 *
 * Devuelve null si no hay fecha, y entonces la UI no muestra nada — mejor eso
 * que un «Día 1 de 30» que no significa nada.
 */
export function diaDelCiclo(creadoEn: string | null | undefined, ahora = new Date()) {
  if (!creadoEn) return null

  const inicio = new Date(creadoEn)
  if (Number.isNaN(inicio.getTime())) return null

  const MS_POR_DIA = 24 * 60 * 60 * 1000

  // Se comparan días de calendario en UTC: contar por milisegundos haría que
  // «día 2» empezara a la hora exacta de la compra y no al día siguiente.
  const diaInicio = Date.UTC(
    inicio.getUTCFullYear(),
    inicio.getUTCMonth(),
    inicio.getUTCDate(),
  )
  const diaHoy = Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate())

  const transcurridos = Math.floor((diaHoy - diaInicio) / MS_POR_DIA)
  if (transcurridos < 0) return null

  return {
    dia: Math.min(transcurridos + 1, DIAS_DE_PORTAL),
    total: DIAS_DE_PORTAL,
    /** Porcentaje recorrido, 0–100. */
    progreso: Math.min(Math.round(((transcurridos + 1) / DIAS_DE_PORTAL) * 100), 100),
    /** Si ya se agotaron los 30 días de guía activa. */
    terminado: transcurridos + 1 > DIAS_DE_PORTAL,
  }
}
