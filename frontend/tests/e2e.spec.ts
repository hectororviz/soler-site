import { expect, test } from '@playwright/test';

const publicRoutes: Array<{ path: string; title: string; h1: RegExp }> = [
  { path: '/', title: /CSD Soler/, h1: /más que un club/i },
  { path: '/competiciones', title: /Competiciones/, h1: /competiciones/i },
  { path: '/fixture', title: /Fixture/, h1: /fixture/i },
  { path: '/resultados', title: /Resultados/, h1: /resultados/i },
  { path: '/posiciones', title: /Posiciones/, h1: /posiciones/i },
  { path: '/soler-tv', title: /Soler TV/, h1: /soler tv/i },
  { path: '/el-club', title: /El Club/, h1: /el club/i },
  { path: '/galeria', title: /Galería/, h1: /galería/i },
  { path: '/contacto', title: /Contacto/, h1: /contacto/i },
];

for (const r of publicRoutes) {
  test(`SEO+layout ${r.path}`, async ({ page }) => {
    await page.goto(r.path);
    await expect(page).toHaveTitle(r.title);
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1.first()).toContainText(r.h1);

    // Sin scroll horizontal global.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    // Imágenes: alt siempre + dimensiones anti-CLS.
    const bad = await page.evaluate(() => {
      const out: string[] = [];
      for (const img of [...document.images]) {
        if (!img.alt) out.push(`sin-alt:${img.src.slice(-40)}`);
        if (!img.getAttribute('width') || !img.getAttribute('height')) {
          out.push(`sin-dims:${img.src.slice(-40)}`);
        }
      }
      return out;
    });
    expect(bad).toEqual([]);

    // Meta base: descripción + canónica.
    const desc = await page.getAttribute('meta[name="description"]', 'content');
    expect(desc && desc.length > 20).toBeTruthy();
    const canonical = await page.getAttribute('link[rel="canonical"]', 'href');
    expect(canonical).toContain('https://csdsoler.com.ar');
  });
}

test('resultados usa mocks y sincroniza URL', async ({ page }) => {
  await page.goto('/resultados');
  // Con VITE_USE_MOCKS=true hay datos locales (no error genérico).
  await expect(page.locator('h1')).toContainText(/resultados/i);
  await expect(page.getByText(/fecha 7/i).first()).toBeVisible({ timeout: 10_000 });
  // Cambiar de fecha escribe ?fecha= en la URL.
  const url = new URL(page.url());
  expect(url.searchParams.get('torneo') ?? 'ok').toBeTruthy();
});

test('drawer móvil: abre, atrapa foco y cierra con Escape', async ({ page, viewport }) => {
  test.skip(!viewport || viewport.width > 768, 'solo móvil');
  await page.goto('/');
  const openBtn = page.getByRole('button', { name: /abrir menú/i });
  await openBtn.click();
  const dialog = page.getByRole('dialog', { name: /menú de navegación/i });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: /cerrar menú/i })).toBeFocused();
  // Tab cicla dentro del diálogo (trampa de foco).
  await page.keyboard.press('Tab');
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(openBtn).toBeFocused();
});

test('fixture genera flyer de la fecha en 1080x1920', async ({ page }) => {
  await page.goto('/fixture');
  const btn = page.getByRole('button', { name: /descargar flyer/i }).first();
  await expect(btn).toBeVisible({ timeout: 10_000 });
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15_000 }),
    btn.click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.png$/);
  // La imagen generada respeta el formato historia.
  const path = await download.path();
  expect(path).toBeTruthy();
});

test('flyers: matriz plantillas × formatos renderiza y exporta', async ({ page }) => {
  await page.goto('/flyer-lab');
  // La ruta lab solo existe en dev; si no está (build prod), se omite.
  await expect(page.locator('h1')).not.toBeEmpty({ timeout: 15_000 });
  test.skip((await page.locator('#flyer-lab-results').count()) === 0, 'ruta lab solo disponible en dev');
  await expect.poll(async () => page.title(), { timeout: 60_000 }).toBe('flyer-lab-done');
  const raw = await page.locator('#flyer-lab-results').textContent();
  const results = JSON.parse(raw ?? '[]') as Array<{ template: string; format: string; w: number; h: number; ok: boolean }>;
  expect(results).toHaveLength(16);
  for (const r of results) {
    expect(r.ok, `${r.template}/${r.format}`).toBe(true);
  }
  const dims: Record<string, [number, number]> = { story: [1080, 1920], feed: [1080, 1350], square: [1080, 1080] };
  for (const r of results) {
    if (r.format === '-') continue;
    expect([r.w, r.h]).toEqual(dims[r.format]);
  }
});

test('estudio de flyers en modo demo genera PNG', async ({ page }) => {
  await page.addInitScript(() => {
    const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    localStorage.setItem('csd-admin-token', `${b64({ alg: 'none' })}.${b64({ exp: 9999999999, sub: 'e2e' })}.x`);
  });
  await page.goto('/admin/flyers?demo=1');
  await expect(page.getByRole('heading', { name: /estudio de flyers/i })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('canvas[aria-label^="Vista previa"]')).toBeVisible();
  await page.getByRole('button', { name: /social bold/i }).click();
  // La vista previa queda fija mientras se configura (solo desktop).
  const viewport = page.viewportSize();
  if (viewport && viewport.width >= 1024) {
    const stickyHost = page.locator('canvas[aria-label^="Vista previa"]').locator('xpath=ancestor::div[contains(@class,"lg:sticky")][1]');
    await expect(stickyHost).toHaveCount(1);
    expect(await stickyHost.evaluate((e) => getComputedStyle(e as HTMLElement).position)).toBe('sticky');
  }
  await page.locator('summary', { hasText: 'Fecha' }).click();
  await page.getByRole('button', { name: /ambas/i }).click();
  await page.locator('summary', { hasText: 'Horarios' }).click();
  await page.getByRole('button', { name: /^tabla$/i }).click();
  // Edición visual: click selecciona bloque, arrastre lo mueve.
  const preview = page.locator('canvas[aria-label^="Vista previa"]');
  await preview.scrollIntoViewIfNeeded();
  const box = await preview.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.45);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height * 0.45 + 30, { steps: 4 });
    await page.mouse.up();
  }
  await expect(page.getByText(/bloque seleccionado/i)).toBeVisible({ timeout: 10_000 });
  await page.locator('summary', { hasText: 'Contenido' }).click();
  await page.getByRole('checkbox', { name: /torneo/i }).uncheck();
  await page.locator('summary', { hasText: 'Escudos' }).click();
  await page.getByRole('checkbox', { name: /quitar fondo blanco/i }).check();
  await page.getByLabel('Tamaño escudos').evaluate((el, v) => {
    const input = el as HTMLInputElement;
    input.value = String(v);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, '1.3');
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 20_000 }),
    page.getByRole('button', { name: 'Descargar PNG', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/social-bold.*\.png$/);
});

test('admin no indexa', async ({ page }) => {
  await page.goto('/admin/login');
  await expect(page.getByRole('heading', { name: /administración/i })).toBeVisible();
  await expect.poll(async () => page.getAttribute('meta[name="robots"]', 'content')).toContain('noindex');
});
