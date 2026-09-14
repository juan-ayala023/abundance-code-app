import { Contenedor } from '@/components/layout/contenedor'
import { Tarjeta } from '@/components/layout/tarjeta'

/**
 * Lo que se ve mientras una pantalla del portal se está preparando.
 *
 * Existe por una queja concreta de la revisión de septiembre de 2026: «abrir
 * Activación desde el menú compacto no cambió de ruta». El enlace funcionaba.
 * Lo que pasaba es que `/activacion` genera durante el render —unos 13 s la
 * primera vez del día— y `/carta` escribe el retrato la primera vez que se
 * abre, más de un minuto. Sin un `loading.tsx`, Next no cambia de ruta hasta
 * que el servidor termina, así que el cajón del menú seguía abierto, la URL
 * seguía siendo la anterior y no había ninguna señal de que algo estuviera
 * pasando. En un teléfono eso se lee como «no hizo nada».
 *
 * Con esto, la navegación es inmediata: cambia la ruta, el cajón se cierra
 * solo (se cierra al cambiar `pathname`) y se ve un esqueleto hasta que llega
 * el contenido. `motion-safe` porque un pulso continuo molesta a quien pidió
 * menos movimiento.
 */
export default function Cargando() {
  return (
    <Contenedor>
      <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
        <div className="h-9 w-2/3 max-w-sm rounded-xl bg-fondo-hondo motion-safe:animate-pulse" />
        <div className="h-4 w-1/2 max-w-xs rounded-lg bg-fondo-hondo motion-safe:animate-pulse" />
      </div>

      <Tarjeta className="flex flex-col gap-4">
        <div className="h-4 w-1/3 rounded-lg bg-fondo-hondo motion-safe:animate-pulse" />
        <div className="h-4 w-full rounded-lg bg-fondo-hondo motion-safe:animate-pulse" />
        <div className="h-4 w-5/6 rounded-lg bg-fondo-hondo motion-safe:animate-pulse" />
        <div className="h-4 w-2/3 rounded-lg bg-fondo-hondo motion-safe:animate-pulse" />
      </Tarjeta>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, indice) => (
          <Tarjeta key={indice} className="h-36 motion-safe:animate-pulse" />
        ))}
      </div>
    </Contenedor>
  )
}
