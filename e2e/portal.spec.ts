import {
  cancelarCompra,
  envejecerPortal,
  expect,
  sembrarActivacion,
  test,
} from './fixtures'

/**
 * Recorre las pantallas del portal.
 *
 * Todas están detrás de login, así que las pruebas de rutas no llegan a
 * renderizarlas: sin esto, un error de render aquí pasaría desapercibido.
 */

/** Completa el onboarding, requisito de casi todas las pantallas. */
async function completarOnboarding(page: import('@playwright/test').Page) {
  await page.goto('/onboarding')
  await page.getByRole('textbox', { name: 'Nombre completo' }).fill('Persona de prueba')
  await page.getByLabel('Fecha de nacimiento').fill('1992-06-15')
  await page.getByLabel('Hora de nacimiento', { exact: true }).fill('08:30')
  await page.getByLabel('Ciudad de nacimiento').fill('Bogota')
  const opcion = page.getByRole('option').first()
  await expect(opcion).toBeVisible({ timeout: 15_000 })
  await opcion.click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page).toHaveURL(/\/portal/)
}

test('la navegación lateral lleva a todas las secciones', async ({ page }) => {
  await completarOnboarding(page)

  const nav = page.getByRole('navigation', { name: 'Navegación principal' })

  for (const [etiqueta, url] of [
    ['Lectura Base', /\/lectura-base/],
    ['Activación de Hoy', /\/activacion/],
    ['Guía Personalizada', /\/guia/],
    ['Mi Cuenta', /\/cuenta/],
    ['Mi Portal', /\/portal/],
  ] as const) {
    await nav.getByRole('link', { name: etiqueta }).click()
    await expect(page).toHaveURL(url)
  }
})

test('la lectura base enseña sus secciones aunque no esté generada', async ({ page }) => {
  await completarOnboarding(page)
  await page.goto('/lectura-base')

  await expect(
    page.getByRole('heading', { name: 'Tu Lectura Base Personalizada' }),
  ).toBeVisible()

  // Sin contenido generado hay que decirlo, no rellenar con texto de muestra.
  await expect(page.getByText(/todavía no está generada/i)).toBeVisible()
  await expect(page.getByText('Tus patrones de abundancia')).toBeVisible()
})

test('la activación anuncia sus partes sin inventarlas', async ({ page }) => {
  await completarOnboarding(page)
  await page.goto('/activacion')

  /*
   * El servidor de estas pruebas corre sin clave de IA, así que la generación
   * falla. Se comprueba que lo dice y que igualmente enseña de qué se compone
   * una activación, en vez de dejar la pantalla en blanco.
   */
  await expect(page.getByText(/no hemos podido preparar tu activación/i)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Qué evitar' })).toBeVisible()
})

test('la activación del día se muestra y se puede marcar como leída', async ({
  page,
  usuario,
}) => {
  await completarOnboarding(page)

  // El portal se acaba de crear, así que hoy es el día 1 del ciclo.
  await sembrarActivacion(usuario.id, 1)

  await page.goto('/activacion')

  // El día va en el titular, como en el producto original.
  await expect(page.getByRole('heading', { name: 'Activación del Día 1' })).toBeVisible()
  await expect(page.getByText(/tu atención vale más que tu esfuerzo/i)).toBeVisible()
  await expect(page.getByText(/todavía no hay activaciones/i)).toHaveCount(0)

  // Antes de marcarla, se anuncia cuándo llega la siguiente.
  await expect(page.getByText(/se desbloquea mañana/i)).toBeVisible()

  await page.getByRole('button', { name: 'Marcar como leída' }).click()

  // Queda registrado y el botón desaparece: no es un interruptor.
  await expect(page.getByText(/marcada como leída el/i)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Marcar como leída' })).toHaveCount(0)
})

test('la guía muestra el límite real y el aviso legal', async ({ page }) => {
  await completarOnboarding(page)
  await page.goto('/guia')

  // 3 al día, no 20: es lo que promete el producto al usuario.
  await expect(page.getByText(/3 consultas por día/i)).toBeVisible()

  // El aviso legal cubre los guardrails de CLAUDE.md §8.
  await expect(page.getByText(/no reemplaza asesoría médica/i)).toBeVisible()

  // Sin pregunta no se puede enviar.
  await expect(page.getByRole('button', { name: 'Consultar mi guía' })).toBeDisabled()
})

test('la consulta se envía y avisa cuando no puede responder', async ({ page }) => {
  await completarOnboarding(page)
  await page.goto('/guia')

  const boton = page.getByRole('button', { name: 'Consultar mi guía' })

  // Una pregunta demasiado corta no habilita el envío: gastar una de las tres
  // consultas del día en «hola» sería un mal negocio para el usuario.
  await page.getByLabel(/qué necesitas entender hoy/i).fill('hola')
  await expect(boton).toBeDisabled()

  await page.getByLabel(/qué necesitas entender hoy/i).fill('¿Qué bloqueo necesito observar ahora?')
  await expect(boton).toBeEnabled()

  await boton.click()

  /*
   * El servidor de estas pruebas corre sin clave de IA, así que la consulta no
   * puede responderse. Lo que se prueba es que el formulario llega hasta la
   * acción de servidor y devuelve el error a la pantalla, en vez de quedarse
   * pensando para siempre.
   */
  // Por el texto y no por `role="alert"`: Next añade el suyo para anunciar
  // cambios de ruta y el selector se vuelve ambiguo.
  await expect(page.getByText(/no pudimos responder tu consulta/i)).toBeVisible()
})

test('las preguntas sugeridas rellenan el campo', async ({ page }) => {
  await completarOnboarding(page)
  await page.goto('/guia')

  await page.getByRole('button', { name: '¿Qué decisión estoy evitando?' }).click()
  await expect(page.getByLabel(/qué necesitas entender hoy/i)).toHaveValue(
    '¿Qué decisión estoy evitando?',
  )
})

test('mi cuenta muestra los datos reales del usuario', async ({ page, usuario }) => {
  await page.goto('/cuenta')

  await expect(page.getByRole('heading', { name: 'Mi Cuenta' })).toBeVisible()
  await expect(page.getByText(usuario.email)).toBeVisible()
  // `exact` importa: el email de prueba también empieza por «e2e-».
  await expect(page.getByText('e2e', { exact: true })).toBeVisible()
})

test('mi cuenta muestra el día del ciclo y la fecha de activación', async ({ page }) => {
  await completarOnboarding(page)
  await page.goto('/cuenta')

  // Los dos datos que la app anterior enseña aquí y que faltaban.
  await expect(page.getByText('Día actual')).toBeVisible()
  await expect(page.getByText('Día 1 de 30')).toBeVisible()
  await expect(page.getByText('Fecha de activación')).toBeVisible()
})

test('generando refleja el progreso real, no un temporizador', async ({ page }) => {
  await completarOnboarding(page)
  await page.goto('/generando')

  const barra = page.getByRole('progressbar', { name: /progreso de tu lectura/i })
  await expect(barra).toBeVisible()

  /*
   * La carta ya está calculada al terminar el onboarding, así que el primer
   * paso de cinco está hecho de verdad: 20 %. Si esto fuera una animación, el
   * valor dependería de cuándo se mire.
   */
  await expect(barra).toHaveAttribute('aria-valuenow', '20')
  await expect(page.getByText('Paso 2 de 5')).toBeVisible()

  /*
   * El servidor de estas pruebas corre sin clave de IA a propósito (ver
   * `playwright.config.ts`), así que la generación falla. Lo que se comprueba
   * aquí es que falla **bien**: avisa, dice que los datos están a salvo y no
   * deja la pantalla colgada en un cargando eterno.
   */
  await expect(page.getByText(/no hemos podido preparar tu lectura/i)).toBeVisible()
  await expect(page.getByText(/tus datos y tu carta están guardados/i)).toBeVisible()
})

/**
 * Pasar del día 30 **no** cierra nada mientras se siga pagando.
 *
 * Esta prueba comprobaba lo contrario, y era el fallo más caro del cambio de
 * contrato. La regla vieja —«pasados los 30 días sin `stripe_subscription_id`,
 * solo lectura»— venía de suponer que podía haber compras sueltas. El precio
 * real es una **suscripción con 30 días de trial**, y el backend de la landing
 * no nos manda ids de Stripe, así que aquella regla habría dejado sin guía **a
 * todo el mundo el día 31**: justo a quienes acababan de pagar su primer mes.
 *
 * Lo que el usuario nunca pierde —la lectura y la carta— se comprueba en la
 * prueba de la cancelación, que es cuando eso está de verdad en juego.
 */
test('pasado el día 30, quien sigue pagando conserva la guía', async ({
  page,
  usuario,
}) => {
  await completarOnboarding(page)
  await envejecerPortal(usuario.id, 45)

  // Día 46 y suscripción al corriente: la guía sigue abierta.
  await page.goto('/guia')
  await expect(page.getByRole('button', { name: 'Consultar mi guía' })).toBeVisible()
  await expect(page.getByText(/necesita suscripción/i)).toHaveCount(0)

  // Y las activaciones diarias, que son el motivo de la cuota mensual.
  await page.goto('/activacion')
  await expect(page.getByText(/necesita suscripción/i)).toHaveCount(0)

  await page.goto('/lectura-base')
  await expect(
    page.getByRole('heading', { name: 'Tu Lectura Base Personalizada' }),
  ).toBeVisible()

  await page.goto('/carta')
  await expect(page.getByRole('img', { name: /carta natal/i })).toBeVisible()
})

/**
 * Quien cancela conserva lo que compró.
 *
 * Es el caso que el precio real vuelve habitual: 49 $ el primer mes y 15 $/mes
 * después significa que en Stripe **todo comprador es un suscriptor**, así que
 * darse de baja es un camino que muchos recorrerán, no un borde.
 *
 * Antes se le expulsaba del portal entero desde el layout, sin llegar siquiera a
 * evaluar el nivel de acceso: pagaba 49 $, recibía su lectura, cancelaba, y
 * perdía también la lectura. La prueba de los 30 días no lo veía porque envejece
 * el portal pero deja el entitlement en `active`.
 */
test('quien cancela conserva su lectura y su carta, y pierde la guía', async ({
  page,
  usuario,
}) => {
  await completarOnboarding(page)
  await cancelarCompra(usuario.email)

  // Lo que compró y ya leyó no se le retira. Esto es lo que fallaba.
  await page.goto('/lectura-base')
  await expect(
    page.getByRole('heading', { name: 'Tu Lectura Base Personalizada' }),
  ).toBeVisible()

  await page.goto('/carta')
  await expect(page.getByRole('img', { name: /carta natal/i })).toBeVisible()

  // Y sigue pudiendo ver su cuenta, con el estado real de la compra.
  await page.goto('/cuenta')
  await expect(page.getByText('Cancelado')).toBeVisible()

  // Lo que dejó de pagar, sí se cierra — incluso dentro de los primeros 30 días.
  await page.goto('/guia')
  await expect(page.getByText(/necesita suscripción/i)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Consultar mi guía' })).toHaveCount(0)

  await page.goto('/activacion')
  await expect(page.getByText(/necesita suscripción/i)).toBeVisible()
})

/**
 * En móvil la barra lateral desaparece (`lg:flex`), así que sin el cajón no
 * habría forma de moverse por el portal.
 */
test.describe('en móvil', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('el menú se abre, navega y se cierra', async ({ page }) => {
    await completarOnboarding(page)
    await page.goto('/portal')

    // La barra lateral no está; el botón de menú, sí.
    // `exact`: sin él, «Menú» casa también con «Cerrar el menú» del cajón,
    // porque Playwright busca por subcadena.
    const boton = page.getByRole('button', { name: 'Menú', exact: true })
    await expect(boton).toBeVisible()
    await expect(boton).toHaveAttribute('aria-expanded', 'false')

    await boton.click()

    const cajon = page.getByRole('dialog', { name: 'Navegación principal' })
    await expect(cajon).toBeVisible()
    await expect(boton).toHaveAttribute('aria-expanded', 'true')

    // Escape lo cierra: es lo primero que prueba quien usa teclado.
    await page.keyboard.press('Escape')
    await expect(cajon).toBeHidden()

    // Y al navegar se cierra solo, en vez de quedarse sobre la pantalla nueva.
    await boton.click()
    await cajon.getByRole('link', { name: 'Mi Cuenta' }).click()
    await expect(page).toHaveURL(/\/cuenta/)
    await expect(cajon).toBeHidden()
  })

  /**
   * Se comprueban tres anchos y **dos** fallos distintos.
   *
   * Que la página desborde no es el único modo de que se vea contenido cortado,
   * ni el más frecuente. Un hijo con `overflow-x-auto` absorbe el exceso: la
   * página deja de desbordar y la prueba se pone verde mientras el usuario ve
   * la tabla partida por la derecha, porque la barra de ese contenedor no se
   * dibuja hasta que se arrastra. Fue exactamente lo que pasó: la tabla de
   * posiciones se recortaba desde 428 px hacia abajo y la comprobación a 390 px
   * no lo veía. Por eso ahora se mira también dentro.
   *
   * 430 px es el iPhone 14 Pro Max, que es donde se reportó; 360 es el Android
   * corriente, el caso más estrecho que hay que sostener.
   */
  for (const ancho of [360, 390, 430]) {
    test(`ninguna pantalla recorta contenido a ${ancho} px`, async ({ page }) => {
      await completarOnboarding(page)
      await page.setViewportSize({ width: ancho, height: 844 })

      for (const ruta of [
        '/portal',
        '/carta',
        '/lectura-base',
        '/activacion',
        '/guia',
        '/cuenta',
      ]) {
        await page.goto(ruta)

        const { desborda, recortados } = await page.evaluate(() => {
          const recortados: string[] = []

          for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
            /*
             * `clientWidth <= 1` descarta los elementos ocultos a la vista y
             * los `sr-only`, que se esconden recortándolos a un píxel: ahí el
             * recorte es la técnica, no el fallo.
             */
            if (el.clientWidth <= 1) continue
            if (el.scrollWidth <= el.clientWidth + 1) continue

            const señas =
              el.tagName.toLowerCase() +
              (typeof el.className === 'string' && el.className
                ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}`
                : '')

            recortados.push(`${señas} (le faltan ${el.scrollWidth - el.clientWidth}px)`)
          }

          return {
            desborda:
              document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
            recortados,
          }
        })

        expect(desborda, `${ruta} desborda a lo ancho`).toBe(false)
        expect(recortados, `${ruta} recorta contenido por la derecha`).toEqual([])
      }
    })
  }
})

test('las páginas públicas no exigen sesión', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  await page.goto('/planes')
  await expect(page.getByRole('heading', { name: 'Planes' })).toBeVisible()

  await context.close()
})

test('el portal muestra el día real del ciclo de 30', async ({ page }) => {
  await completarOnboarding(page)

  // El portal se acaba de crear, así que es el día 1. El número sale de la
  // fecha de creación, no de un contador guardado que pueda desincronizarse.
  await expect(page.getByRole('heading', { name: 'Día 1 de 30' })).toBeVisible()

  const barra = page.getByRole('progressbar', { name: 'Día 1 de 30' })
  await expect(barra).toBeVisible()
  await expect(barra).toHaveAttribute('aria-valuenow', '3')
})

test('el portal reúne las áreas y el cierre', async ({ page }) => {
  await completarOnboarding(page)

  await expect(page.getByRole('heading', { name: 'Áreas desbloqueadas' })).toBeVisible()
  await expect(page.getByText('Relaciones y vínculos')).toBeVisible()
  await expect(page.getByText(/recordar tu código y alinearte con él/)).toBeVisible()
})

/**
 * «Tu patrón central» llevaba un párrafo escrito a mano, igual para todo el
 * mundo, colocado entre tarjetas con datos reales. En un producto cuyo
 * entregable es una interpretación personal, eso se lee como si fuera la
 * lectura de quien mira.
 */
test('el portal no muestra interpretación de relleno', async ({ page }) => {
  await completarOnboarding(page)

  await expect(page.getByRole('heading', { name: 'Tu Patrón Central' })).toBeVisible()

  // El texto genérico que estaba aquí antes.
  await expect(page.getByText(/ciclo de expansión y claridad/i)).toHaveCount(0)

  // Sin lectura generada se dice que está en camino, no se rellena.
  await expect(page.getByText(/se está preparando desde tu código natal/i)).toBeVisible()
})
