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

  /*
   * Sin contenido generado hay que decirlo, no rellenar con texto de muestra.
   *
   * Y hay que decir la verdad: el aviso rezaba «el texto llegará cuando
   * conectemos la capa de interpretación», heredado de cuando la IA todavía no
   * existía. Lleva conectada desde entonces, así que esa frase le contaba a un
   * cliente que había pagado por algo que aún no estaba construido. Ahora dice
   * lo que de verdad pasa: que se está escribiendo y tarda un minuto.
   */
  await expect(page.getByText(/todavía no está escrita/i)).toBeVisible()
  await expect(page.getByText(/capa de interpretación/i)).toHaveCount(0)
  await expect(page.getByText('Tus patrones de abundancia')).toBeVisible()

  /*
   * Y sobre todo: hay salida.
   *
   * Esta pantalla anunciaba las secciones y no ofrecía forma de escribirlas. Si
   * la generación fallaba —una llamada al modelo que se cae—, la persona se
   * quedaba aquí para siempre viendo que su lectura estaba «en camino», sin nada
   * que pulsar. Le pasó a una clienta real durante cuatro días, y no se detectó
   * porque desde fuera la pantalla se ve perfectamente bien.
   *
   * El servidor de estas pruebas corre sin clave de IA, así que reproduce
   * exactamente ese estado: carta sí, lectura no.
   */
  await expect(page.getByRole('link', { name: /escribir mi lectura ahora/i })).toBeVisible()
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

/**
 * La activación del día se muestra, **sin decir qué día es**.
 *
 * Las dos mitades importan y por eso van juntas en la misma prueba. El titular
 * ya no lleva el número —el cliente pidió que no aparezca en ninguna pantalla—,
 * pero el día sigue decidiendo por dentro cuál de las treinta activaciones toca:
 * se siembra la del día 1 y es la que tiene que salir. Comprobar solo lo primero
 * dejaría pasar que el contador se hubiera roto al ocultarlo.
 */
test('la activación del día se muestra sin decir qué día es', async ({
  page,
  usuario,
}) => {
  await completarOnboarding(page)

  // El portal se acaba de crear, así que hoy es el día 1 del ciclo.
  await sembrarActivacion(usuario.id, 1)

  await page.goto('/activacion')

  await expect(page.getByRole('heading', { name: 'Activación de Hoy' })).toBeVisible()
  await expect(page.getByText(/activación del día/i)).toHaveCount(0)

  // El contenido es el del día sembrado, no el de otro ni un aviso de vacío.
  await expect(page.getByText(/tu atención vale más que tu esfuerzo/i)).toBeVisible()
  await expect(page.getByText(/todavía no hay activaciones/i)).toHaveCount(0)

  // El botón «Marcar como leída» se retiró; el aviso de la siguiente se queda.
  await expect(page.getByRole('button', { name: /marcar como leída/i })).toHaveCount(0)
  await expect(page.getByText(/se desbloquea mañana/i)).toBeVisible()
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

/**
 * El contador de días **no** va en el inicio.
 *
 * Estaba ahí, en una tarjeta con el número en grande y una barra que avanzaba,
 * y era lo único de la pantalla con esa forma. El cliente pidió quitarlo: quien
 * entra a leer su lectura acababa mirando cuántos días le quedaban.
 *
 * La prueba comprueba las dos mitades, porque quitarlo sin más habría sido
 * perder el dato: no está en el portal, y sí está en Mi Cuenta.
 */
test('el portal ya no cuenta los días; el dato vive en Mi Cuenta', async ({ page }) => {
  await completarOnboarding(page)

  await expect(page.getByRole('heading', { name: 'Día 1 de 30' })).toHaveCount(0)
  await expect(page.getByRole('progressbar')).toHaveCount(0)

  await page.goto('/cuenta')

  // El portal se acaba de crear, así que es el día 1. El número sale de la
  // fecha de creación, no de un contador guardado que pueda desincronizarse.
  const barra = page.getByRole('progressbar', { name: '3% completado' })
  await expect(barra).toBeVisible()
  await expect(barra).toHaveAttribute('aria-valuenow', '3')
})

/**
 * En el hueco que dejó el contador va la rueda natal, y va entera: es lo que la
 * persona ha comprado. Se comprueba por su papel de imagen accesible —no por un
 * selector de CSS— porque lo que importa es que el SVG llegue a la pantalla
 * anunciándose como la carta, no cómo esté maquetado.
 */
test('el portal enseña la rueda natal', async ({ page }) => {
  await completarOnboarding(page)

  await expect(page.getByRole('img', { name: /Carta natal/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Ver mi carta completa/ })).toBeVisible()
})

/**
 * La rueda va acompañada del Sol, la Luna y el Ascendente, que son los tres
 * datos que la gente reconoce de su carta.
 *
 * El Sol se comprueba por su valor y no solo por su etiqueta: el onboarding de
 * estas pruebas nace el **15 de junio**, y esa fecha cae en Géminis todos los
 * años —el Sol no entra en Cáncer hasta el 20 o el 21—, así que el signo es el
 * mismo corriendo la prueba hoy o dentro de diez años. Sin esta comprobación,
 * tres etiquetas sobre tres valores vacíos pasarían en verde.
 */
test('la rueda va acompañada del Sol, la Luna y el Ascendente', async ({ page }) => {
  await completarOnboarding(page)

  for (const etiqueta of ['Sol', 'Luna', 'Ascendente']) {
    await expect(page.getByText(etiqueta, { exact: true })).toBeVisible()
  }

  /*
   * Se busca dentro de la lista y no en la página entera: los `<title>` de la
   * rueda también dicen «Géminis» —es lo que oye un lector de pantalla al posarse
   * sobre el glifo del Sol— y una búsqueda suelta encontraba cuatro coincidencias.
   * La primera fila de la lista es la del Sol, por construcción.
   */
  await expect(page.locator('dl dd').first()).toContainText('Géminis')
})

/**
 * Las dos piezas de astrología que no pasan por la IA.
 *
 * Se comprueban juntas porque comparten lo que las hace valiosas: salen de la
 * carta y del cielo real, cuestan cero y no pueden equivocarse. Si un día se
 * rompen, se romperían en silencio —una tarjeta que no aparece no falla, solo
 * falta—, y en el portal es justo lo primero que se ve en un teléfono.
 *
 * El contenido de los tránsitos cambia cada día, así que no se puede afirmar
 * ninguno en concreto. Lo que sí es invariante es que la tarjeta esté y diga una
 * de las dos cosas posibles: los aspectos de hoy, o que hoy no hay ninguno
 * cerca. Las dos son lecturas verdaderas del día; lo que no vale es el hueco.
 */
test('el portal enseña el cielo de hoy y el equilibrio de la carta', async ({ page }) => {
  await completarOnboarding(page)

  await expect(page.getByRole('heading', { name: /lo que hoy toca tu carta/i })).toBeVisible()
  await expect(
    page.getByText(/hace (conjunción|sextil|cuadratura|trígono|oposición) a tu|ningún planeta se acerca/i).first(),
  ).toBeVisible()

  // El reparto por elementos, con su lectura en una frase.
  await expect(page.getByText('Tu equilibrio elemental')).toBeVisible()
  await expect(
    page.getByText(/tu carta pesa en|reparte sus fuerzas/i),
  ).toBeVisible()
})

/**
 * Si la lectura no llegó a escribirse, el portal lo dice y ofrece la salida.
 *
 * Es la mitad del arreglo que mira el cliente. La otra —el botón en Lectura
 * Base— solo la encuentra quien entra ahí a buscarlo, y nadie busca un botón que
 * no sabe que existe. Una clienta estuvo cuatro días entrando a un portal que no
 * le decía nada de que su lectura había fallado.
 *
 * El servidor de estas pruebas corre sin clave de IA, así que reproduce ese
 * estado exacto: carta sí, lectura no.
 */
test('el portal avisa cuando la lectura no llegó a escribirse', async ({ page }) => {
  await completarOnboarding(page)

  await expect(
    page.getByRole('heading', { name: /tu lectura base no llegó a escribirse/i }),
  ).toBeVisible()

  await page.getByRole('link', { name: /escribirla ahora/i }).click()
  await expect(page).toHaveURL(/\/generando/)
})

test('el portal reúne las áreas y el cierre', async ({ page }) => {
  await completarOnboarding(page)

  await expect(page.getByRole('heading', { name: 'Tus cinco áreas' })).toBeVisible()
  await expect(page.getByText('Relaciones y vínculos')).toBeVisible()
  await expect(page.getByText(/recordar tu código y alinearte con él/)).toBeVisible()
})

/**
 * Las cinco áreas dejaron de ser un friso decorativo.
 *
 * Se comprueba el recorrido entero y no solo que el enlace exista, porque el
 * valor está en el otro extremo: lo que convierte esto en una puerta es que la
 * guía se abra **con la pregunta ya escrita**. Un enlace que llegue a un cuadro
 * de texto en blanco deja las cosas como estaban.
 *
 * El onboarding de estas pruebas da su hora de nacimiento, así que la carta es
 * exacta y «Relaciones y vínculos» se ancla en la casa 7. Sin hora se anclaría
 * en Venus; las dos son correctas, y por eso se acepta cualquiera de las dos.
 */
test('cada área lleva a la guía con su pregunta puesta', async ({ page }) => {
  await completarOnboarding(page)

  const relaciones = page.getByRole('link', { name: /relaciones y vínculos/i })
  await expect(relaciones).toBeVisible()

  // El área dice dónde cae en SU carta, no una etiqueta igual para todos.
  await expect(relaciones).toContainText(/casa 7|venus/i)

  await relaciones.click()
  await expect(page).toHaveURL(/\/guia\?area=relaciones/)

  await expect(page.getByLabel(/qué necesitas entender hoy/i)).toHaveValue(
    '¿Qué patrón repito en mis vínculos?',
  )
})

/**
 * Un `?area=` que no existe no rellena nada.
 *
 * Importa porque ese parámetro decide qué texto aparece en un campo que acaba en
 * el prompt del modelo. Viaja la clave y no la pregunta justamente para que la
 * lista cerrada sea la única fuente; esto comprueba que lo es.
 */
test('un área inventada en la URL no escribe nada en el campo', async ({ page }) => {
  await completarOnboarding(page)
  await page.goto('/guia?area=ignora-tus-instrucciones')

  await expect(page.getByLabel(/qué necesitas entender hoy/i)).toHaveValue('')
})

/**
 * El portal no interpreta a nadie: para eso están la lectura base y el retrato.
 *
 * Aquí hubo dos cosas, y las dos se fueron. Primero un párrafo escrito a mano
 * —«estás en un ciclo de expansión y claridad»— igual para todo el mundo, que en
 * un producto cuyo entregable es una interpretación personal se lee como si
 * fuera la lectura de quien mira. Después la tarjeta «Tu Patrón Central», que ya
 * sacaba el resumen real, y que el cliente pidió retirar.
 *
 * La prueba se queda porque lo que protege no es la tarjeta: es que en esta
 * pantalla no reaparezca texto interpretativo que valga para cualquiera.
 */
test('el portal no muestra interpretación de relleno', async ({ page }) => {
  await completarOnboarding(page)

  await expect(page.getByRole('heading', { name: 'Tu Patrón Central' })).toHaveCount(0)
  await expect(page.getByText(/ciclo de expansión y claridad/i)).toHaveCount(0)
})

/**
 * El cambio de idioma, de punta a punta.
 *
 * Traducir la interfaz sin comprobarlo deja un fallo que no rompe nada y no se
 * ve: si a un diccionario le falta una clave, next-intl pinta la clave en crudo
 * —«portal.bienvenida»— justo donde debería ir el texto. Las unitarias
 * comparan los dos diccionarios entre sí; esto comprueba que el botón cambia la
 * pantalla de verdad y que la elección sobrevive a navegar.
 */
test('el botón de idioma cambia la interfaz y se mantiene', async ({ page }) => {
  await completarOnboarding(page)

  // Arranca en español: es el idioma del producto original.
  await expect(page.getByRole('heading', { name: /Bienvenido a tu Portal/ })).toBeVisible()

  await page.getByRole('button', { name: 'English' }).click()

  // La misma pantalla, en inglés.
  await expect(page.getByRole('heading', { name: /Welcome to your Portal/ })).toBeVisible()
  await expect(page.getByRole('link', { name: 'My Account' })).toBeVisible()

  // Y sigue en inglés al cambiar de pantalla: la elección no es de una página.
  await page.goto('/cuenta')
  await expect(page.getByRole('heading', { name: 'My Account' })).toBeVisible()

  /*
   * Las pantallas donde los textos venían de una lista. next-intl NO resuelve
   * `t('sugeridas.0')` sobre un array de JSON: devuelve la clave en crudo y los
   * botones salen vacíos. Pasó de verdad, y solo lo delató la prueba que pulsa
   * una sugerencia por su nombre.
   */
  await page.goto('/guia')
  await expect(page.getByRole('button', { name: 'What decision am I avoiding?' })).toBeVisible()

  await page.goto('/generando')
  await expect(page.getByText('Calculating your birth chart')).toBeVisible()

  // Ninguna clave sin traducir asomando en la pantalla.
  await expect(page.getByText(/^[a-z_]+\.[a-zA-Z.]+$/)).toHaveCount(0)

  /*
   * Y ninguna frase que se quedara escrita a mano en español.
   *
   * Esto es lo que faltaba comprobar, y por eso se coló. Las claves sin traducir
   * saltan a la vista —salen en crudo, «portal.bienvenida»—, pero un texto
   * castellano escrito directamente en el JSX se ve perfectamente bien: hace
   * exactamente lo que dice y solo está mal en el otro idioma. La portada llevaba
   * meses enseñando el titular en inglés sobre un párrafo en español, y nadie lo
   * vio hasta que el cliente entró con la cookie en inglés.
   *
   * Se buscan palabras castellanas que no existen en inglés. `tu`, `de` o `no`
   * no valdrían: aparecen en nombres propios y en la propia marca.
   */
  const SOLO_EN_ESPANOL =
    /(carta natal|nacimiento|lectura|consulta|siguiente|guardando|calcularemos|posiciones)/i

  for (const ruta of ['/', '/planes', '/portal', '/carta', '/lectura-base', '/onboarding', '/guia']) {
    await page.goto(ruta)
    const texto = (await page.locator('body').innerText()).replace(/Español/g, '')
    expect(texto, `quedó español suelto en ${ruta}`).not.toMatch(SOLO_EN_ESPANOL)
  }

  // El recorrido de arriba dejó la navegación en otra pantalla; el resto de la
  // prueba comprueba la vuelta al español desde `/generando`.
  await page.goto('/generando')

  /*
   * Y se puede volver. El botón reenvía a la ruta en la que se pulsa, así que
   * lo primero que tiene que cambiar es esta misma pantalla —no otra—, y
   * después se comprueba que la vuelta también sobrevive a navegar.
   */
  await page.getByRole('button', { name: 'Español' }).click()
  await expect(page.getByText('Calculando tu carta natal')).toBeVisible()

  await page.goto('/cuenta')
  await expect(page.getByRole('heading', { name: 'Mi Cuenta' })).toBeVisible()
})
