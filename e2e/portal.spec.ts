import { expect, test } from './fixtures'

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
    ['Lectura base', /\/lectura-base/],
    ['Activación de hoy', /\/activacion/],
    ['Guía personalizada', /\/guia/],
    ['Mi cuenta', /\/cuenta/],
    ['Mi portal', /\/portal/],
  ] as const) {
    await nav.getByRole('link', { name: etiqueta }).click()
    await expect(page).toHaveURL(url)
  }
})

test('la lectura base enseña sus secciones aunque no esté generada', async ({ page }) => {
  await completarOnboarding(page)
  await page.goto('/lectura-base')

  await expect(
    page.getByRole('heading', { name: 'Tu lectura base personalizada' }),
  ).toBeVisible()

  // Sin contenido generado hay que decirlo, no rellenar con texto de muestra.
  await expect(page.getByText(/todavía no está generada/i)).toBeVisible()
  await expect(page.getByText('Tus patrones de abundancia')).toBeVisible()
})

test('la activación anuncia sus partes sin inventarlas', async ({ page }) => {
  await completarOnboarding(page)
  await page.goto('/activacion')

  await expect(page.getByText(/todavía no hay activaciones/i)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Qué evitar' })).toBeVisible()
})

test('la guía muestra el límite real y el aviso legal', async ({ page }) => {
  await completarOnboarding(page)
  await page.goto('/guia')

  // 3 al día, no 20: es lo que promete el producto al usuario.
  await expect(page.getByText(/3 consultas por día/i)).toBeVisible()

  // El aviso legal cubre los guardrails de CLAUDE.md §8.
  await expect(page.getByText(/no reemplaza asesoría médica/i)).toBeVisible()

  // El botón está deshabilitado y lo explica, en vez de fingir que funciona.
  await expect(page.getByRole('button', { name: 'Consultar mi guía' })).toBeDisabled()
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

  await expect(page.getByRole('heading', { name: 'Mi cuenta' })).toBeVisible()
  await expect(page.getByText(usuario.email)).toBeVisible()
  // `exact` importa: el email de prueba también empieza por «e2e-».
  await expect(page.getByText('e2e', { exact: true })).toBeVisible()
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
