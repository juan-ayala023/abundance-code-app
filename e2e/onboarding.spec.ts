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
  await expect(page.getByRole('heading', { name: 'Tu portal' })).toBeVisible()
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

test('el portal muestra el plan de la compra', async ({ page }) => {
  await page.goto('/portal')

  await expect(page.getByRole('heading', { name: 'Tu portal' })).toBeVisible()
  await expect(page.getByText(/plan e2e/)).toBeVisible()
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
