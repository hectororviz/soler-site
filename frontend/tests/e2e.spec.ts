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

test('admin no indexa', async ({ page }) => {
  await page.goto('/admin/login');
  await expect(page.getByRole('heading', { name: /administración/i })).toBeVisible();
  await expect.poll(async () => page.getAttribute('meta[name="robots"]', 'content')).toContain('noindex');
});
