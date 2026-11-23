import { test, expect } from '@playwright/test'

test('Portada móvil fluida, con retrato y sin descargar audio', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const requests = []
  page.on('request', request => requests.push(request.url()))
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Zeballos Isita')
  const portrait = page.getByRole('img', { name: 'Retrato de Jesús Zeballos con gafas y chaqueta futurista' })
  await expect.poll(() => portrait.evaluate(image => image.naturalWidth)).toBeGreaterThan(0)
  await expect(page.locator('.hero-copy')).toHaveCSS('animation-name', 'none')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  expect(requests.some(url => /\.mp3$/i.test(url))).toBe(false)
  await page.getByRole('link', { name: 'Explorar proyectos' }).click()
  await expect(page).toHaveURL(/#proyectos$/)
})

test('React muestra los datos que devuelve Express desde SQLite', async ({ page }) => {
  const pending = page.waitForResponse(response => response.url().endsWith('/api/projects') && response.ok())
  await page.goto('/')
  const projects = await (await pending).json()
  const cards = page.locator('#portfolio-projects article')
  await expect(cards).toHaveCount(3)
  await expect(cards.first()).toHaveAttribute('data-project-id', String(projects[0].id))
  await expect(cards.first().getByRole('heading')).toHaveText(projects[0].title)
})

test('Conserva el tema al recargar y permite abrir el CV', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Tema oscuro' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Tema oscuro' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('link', { name: 'Ver mi CV' }).click()
  await expect(page).toHaveURL(/resumen\.html$/)
  await expect(page.getByRole('button', { name: 'Imprimir o guardar PDF' })).toBeVisible()
})
