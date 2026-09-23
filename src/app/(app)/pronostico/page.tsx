import { redirect } from 'next/navigation'

/**
 * La ruta se queda; la pantalla se mudó.
 *
 * El documento del 23 de septiembre de 2026 fija el menú en cinco entradas y
 * pide que la lectura del mes viva **dentro** de «Activación de Hoy». Lo que
 * estaba aquí es ahora su primera pestaña.
 *
 * La ruta no se borra porque ya se dio: está en enlaces del portal, en
 * pestañas abiertas y en el historial de quien entró estos días. Un 404 en un
 * sitio donde alguien tenía su lectura es peor que una redirección.
 */
export default function PronosticoPage() {
  redirect('/activacion?vista=mes')
}
