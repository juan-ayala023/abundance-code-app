import { borrarUsuario, crearUsuario, expect, inyectarSesion, test } from './fixtures'

/**
 * Recorre las páginas que están DETRÁS del login.
 *
 * Existe por un motivo concreto: las pruebas de rutas solo ven lo que ve un
 * visitante sin sesión —una redirección— así que dos errores de render en
 * /onboarding llegaron a producción local sin que nada los detectara. Aquí sí
 * se renderizan de verdad.
 */

test('el onboarding se renderiza con sesión iniciada', async ({ page }) => {
  await page.goto('/onboarding')

  await expect(page.getByRole('heading', { name: 'Tus datos de nacimiento' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Nombre completo' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible()
})

test('marcar hora desconocida avisa de lo que se pierde', async ({ page }) => {
  await page.goto('/onboarding')

  await page.getByLabel('No sé mi hora de nacimiento').check()

  // El usuario tiene que saber que su carta irá sin casas antes de continuar.
  await expect(page.getByText(/no podremos incluir las casas/i)).toBeVisible()
  await expect(page.getByLabel('Hora de nacimiento', { exact: true })).toBeDisabled()
})

test('buscar una ciudad muestra su zona horaria', async ({ page }) => {
  await page.goto('/onboarding')

  await page.getByLabel('Ciudad de nacimiento').fill('Bogota')

  const opcion = page.getByRole('option').first()
  await expect(opcion).toBeVisible({ timeout: 15_000 })
  await opcion.click()

  // La zona horaria es lo que hace utilizable el lugar: sin ella no hay carta.
  await expect(page.getByText('America/Bogota')).toBeVisible()
})

test('completar el formulario lleva al portal', async ({ page }) => {
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
  await expect(page.getByRole('heading', { name: /Bienvenido a tu portal/i })).toBeVisible()
})

test('sin elegir ciudad de la lista no se puede continuar', async ({ page }) => {
  await page.goto('/onboarding')

  await page.getByRole('textbox', { name: 'Nombre completo' }).fill('Persona de prueba')
  await page.getByLabel('Fecha de nacimiento').fill('1992-06-15')
  await page.getByLabel('Hora de nacimiento', { exact: true }).fill('08:30')
  // Se escribe la ciudad pero NO se elige de la lista: sin coordenadas ni zona
  // horaria no hay carta posible.
  await page.getByLabel('Ciudad de nacimiento').fill('Bogota')

  await page.getByRole('button', { name: 'Continuar' }).click()

  await expect(page).toHaveURL(/\/onboarding/)
  await expect(page.getByText(/elige una ciudad de la lista/i)).toBeVisible()
})

test('el portal saluda y ofrece completar los datos', async ({ page }) => {
  await page.goto('/portal')

  await expect(page.getByRole('heading', { name: /Bienvenido a tu portal/i })).toBeVisible()

  // Sin datos de nacimiento, lo primero que se ofrece es completarlos.
  await expect(
    page.getByRole('heading', { name: 'Completa tus datos de nacimiento' }),
  ).toBeVisible()

  // Y la navegación lateral acompaña a todas las pantallas del portal.
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeAttached()
})

test('quien tiene sesión pero NO compra acaba en vincular', async ({ browser }) => {
  // El caso que más duele si falla: alguien entra y no sabe por qué no puede pasar.
  const context = await browser.newContext()
  const usuario = await crearUsuario('sincompra', false)

  try {
    await inyectarSesion(context, usuario.email)
    const page = await context.newPage()

    await page.goto('/portal')

    await expect(page).toHaveURL(/\/activar\/vincular/)
    await expect(page.getByText(usuario.email)).toBeVisible()
    // Siempre tiene que haber una salida (CLAUDE.md §3.5).
    await expect(page.getByRole('button', { name: 'Probar con otra cuenta' })).toBeVisible()
  } finally {
    await borrarUsuario(usuario)
    await context.close()
  }
})

test('la carta que se dibuja es la real, calculada desde los datos guardados', async ({
  page,
}) => {
  // Sin datos de nacimiento no hay carta: primero se completa el onboarding.
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

  await page.goto('/carta')

  // La rueda existe y está etiquetada para lectores de pantalla.
  await expect(page.getByRole('img', { name: /carta natal/i })).toBeVisible()

  // Y las posiciones también están en texto, no solo en el gráfico.
  await expect(page.getByRole('table')).toBeVisible()
  await expect(page.getByRole('rowheader', { name: /Sol/ })).toBeVisible()

  // Ya no hay carta de muestra: si el cálculo funcionó, no puede aparecer ni el
  // aviso de ejemplo ni el de fallo.
  await expect(page.getByText(/no es tu carta/i)).toHaveCount(0)
  await expect(page.getByText(/no hemos podido calcular/i)).toHaveCount(0)

  /*
   * El 15 de junio de 1992 Bogotá estaba en horario de verano —Colombia lo tuvo
   * entre 1992 y 1993—, que es justo donde las bases de zonas horarias
   * discrepan. Con hora de nacimiento conocida, la carta debe salir completa:
   * si el instante se hubiera resuelto mal, el ascendente sería otro; si se
   * hubiera perdido, no habría casas.
   */
  await expect(page.getByText(/sin hora de nacimiento/i)).toHaveCount(0)

  // El Sol a mediados de junio está en Géminis, y eso no depende ni de la hora
  // ni del lugar: es una comprobación que no puede pasar por accidente.
  await expect(page.getByRole('row', { name: /Sol/ })).toContainText(/Géminis/i)
})

test('sin datos de nacimiento, la carta manda al onboarding', async ({ page }) => {
  await page.goto('/carta')
  await expect(page).toHaveURL(/\/onboarding/)
})
